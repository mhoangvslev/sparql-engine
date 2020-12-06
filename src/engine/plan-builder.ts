/* file : plan-builder.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

// General libraries
import { Algebra, Parser, Generator } from 'sparqljs'
import { Consumable } from '../operators/update/consumer'
// pipelining engine
import { Pipeline } from '../engine/pipeline/pipeline'
import { PipelineStage } from '../engine/pipeline/pipeline-engine'
// RDF core classes
import { Bindings, BindingBase } from '../rdf/bindings'
import Dataset from '../rdf/dataset'
// Optimization
import Optimizer from '../optimizer/optimizer'
// Solution modifiers
import ask from '../operators/modifiers/ask'
import construct from '../operators/modifiers/construct'
import select from '../operators/modifiers/select'
// Stage builders
import StageBuilder from './stages/stage-builder'
import AggregateStageBuilder from './stages/aggregate-stage-builder'
import BGPStageBuilder from './stages/bgp-stage-builder'
import BindStageBuilder from './stages/bind-stage-builder'
import DistinctStageBuilder from './stages/distinct-stage-builder'
import FilterStageBuilder from './stages/filter-stage-builder'
import TythorStageBuilder from './stages/tythor-stage-builder/tythor-stage-builder'
import GraphStageBuilder from './stages/graph-stage-builder'
import MinusStageBuilder from './stages/minus-stage-builder'
import ServiceStageBuilder from './stages/service-stage-builder'
import OptionalStageBuilder from './stages/optional-stage-builder'
import OrderByStageBuilder from './stages/orderby-stage-builder'
import UnionStageBuilder from './stages/union-stage-builder'
import UpdateStageBuilder from './stages/update-stage-builder'
import AlphaStageBuilder from './stages/alpha-stage-builder'
// caching
import { BGPCache, LRUBGPCache } from './cache/bgp-cache'
// utilities
import {
  partition,
  isNull,
  isString,
  isUndefined,
  some,
  sortBy,
  intersection
} from 'lodash'

import ExecutionContext from './context/execution-context'
import ContextSymbols from './context/symbols'
import { CustomFunctions } from '../operators/expressions/sparql-expression'
import { extractPropertyPaths } from './stages/rewritings'
import { extendByBindings, deepApplyBindings, rdf, findConnectedPattern, getVariables, isTransitiveClosure } from '../utils'

const QUERY_MODIFIERS = {
  SELECT: select,
  CONSTRUCT: construct,
  ASK: ask
}

/**
 * Output of a physical query execution plan
 */
export type QueryOutput = Bindings | Algebra.TripleObject | boolean

/*
 * Class of SPARQL operations that are evaluated by a Stage Builder
 */
export enum SPARQL_OPERATION {
  AGGREGATE,
  BGP,
  BIND,
  DISTINCT,
  FILTER,
  GRAPH,
  MINUS,
  OPTIONAL,
  ORDER_BY,
  PROPERTY_PATH,
  SERVICE,
  UPDATE,
  UNION
}

/**
 * A PlanBuilder builds a physical query execution plan of a SPARQL query,
 * i.e., an iterator that can be consumed to get query results.
 * Internally, it implements a Builder design pattern, where various {@link StageBuilder} are used
 * for building each part of the query execution plan.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export class PlanBuilder {
  private readonly _dataset: Dataset
  private readonly _parser: Parser
  private _optimizer: Optimizer
  private _stageBuilders: Map<SPARQL_OPERATION, StageBuilder>
  private _customFunctions: CustomFunctions | undefined
  private _currentCache: BGPCache | null

  /**
   * Constructor
   * @param dataset - RDF Dataset used for query execution
   * @param prefixes - Optional prefixes to use during query processing
   */
  constructor (dataset: Dataset, prefixes: any = {}, options: any = {}, customFunctions?: CustomFunctions) {
    this._dataset = dataset
    this._parser = new Parser(prefixes)
    this._optimizer = Optimizer.getDefault()
    this._currentCache = null
    this._customFunctions = customFunctions
    this._stageBuilders = new Map()

    // add default stage builders
    this.use(SPARQL_OPERATION.AGGREGATE, new AggregateStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.BGP, new BGPStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.BIND, new BindStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.DISTINCT, new DistinctStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.FILTER, new FilterStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.GRAPH, new GraphStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.MINUS, new MinusStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.SERVICE, new ServiceStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.OPTIONAL, new OptionalStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.ORDER_BY, new OrderByStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.UNION, new UnionStageBuilder(this._dataset))
    this.use(SPARQL_OPERATION.UPDATE, new UpdateStageBuilder(this._dataset))
    if (options['property-paths-strategy'] === 'alpha-operator') {
      this.use(SPARQL_OPERATION.PROPERTY_PATH, new AlphaStageBuilder(this._dataset, options))
    } else {
      this.use(SPARQL_OPERATION.PROPERTY_PATH, new TythorStageBuilder(this._dataset, options))
    }
  }

  /**
   * Set a new {@link Optimizer} uszed to optimize logical SPARQL query execution plans
   * @param  opt - New optimizer to use
   */
  set optimizer (opt: Optimizer) {
    this._optimizer = opt
  }

  /**
   * Register a Stage Builder to evaluate a class of SPARQL operations
   * @param  kind         - Class of SPARQL operations handled by the Stage Builder
   * @param  stageBuilder - New Stage Builder
   */
  use (kind: SPARQL_OPERATION, stageBuilder: StageBuilder) {
    // complete handshake
    stageBuilder.builder = null
    stageBuilder.builder = this
    this._stageBuilders.set(kind, stageBuilder)
  }

  /**
   * Enable Basic Graph Patterns semantic caching for SPARQL query evaluation.
   * The parameter is optional and used to provide your own cache instance.
   * If left undefined, the query engine will use a {@link LRUBGPCache} with
   * a maximum of 500 items and a max age of 20 minutes.
   * @param customCache - (optional) Custom cache instance
   */
  useCache (customCache?: BGPCache): void {
    if (customCache === undefined) {
      this._currentCache = new LRUBGPCache(500, 1200 * 60 * 60)
    } else {
      this._currentCache = customCache
    }
  }

  /**
   * Disable Basic Graph Patterns semantic caching for SPARQL query evaluation.
   */
  disableCache (): void {
    this._currentCache = null
  }

  /**
   * Build the physical query execution of a SPARQL 1.1 query
   * and returns a {@link PipelineStage} or a {@link Consumable} that can be consumed to evaluate the query.
   * @param  query    - SPARQL query to evaluated
   * @param  options  - Execution options
   * @return A {@link PipelineStage} or a {@link Consumable} that can be consumed to evaluate the query.
   */
  build (query: any, context?: ExecutionContext): PipelineStage<QueryOutput> | Consumable {
    // If needed, parse the string query into a logical query execution plan
    if (typeof query === 'string') {
      query = this._parser.parse(query)
    }
    if (isNull(context) || isUndefined(context)) {
      context = new ExecutionContext()
      context.cache = this._currentCache
    }

    // Optimize the logical query execution plan
    console.log(new Generator().stringify(query))
    console.log(JSON.stringify(query))
    query = this._optimizer.optimize(query)
    console.log(new Generator().stringify(query))
    console.log(JSON.stringify(query))

    // build physical query execution plan, depending on the query type
    switch (query.type) {
      case 'query':
        return this._buildQueryPlan(query, context)
      case 'update':
        if (!this._stageBuilders.has(SPARQL_OPERATION.UPDATE)) {
          throw new Error('A PlanBuilder cannot evaluate SPARQL UPDATE queries without a StageBuilder for it')
        }
        return this._stageBuilders.get(SPARQL_OPERATION.UPDATE)!.execute(query.updates, context)
      default:
        throw new SyntaxError(`Unsupported SPARQL query type: ${query.type}`)
    }
  }

  /**
   * Build the physical query execution of a SPARQL query
   * @param  query    - Parsed SPARQL query
   * @param  options  - Execution options
   * @param  source   - Input {@link PipelineStage}
   * @return A {@link PipelineStage} that can be consumed to evaluate the query.
   */
  _buildQueryPlan (query: Algebra.RootNode, context: ExecutionContext, source?: PipelineStage<Bindings>): PipelineStage<Bindings> {
    const engine = Pipeline.getInstance()
    if (isNull(source) || isUndefined(source)) {
      // build pipeline starting iterator
      source = engine.of(new BindingBase())
    }
    context.setProperty(ContextSymbols.PREFIXES, query.prefixes)

    let aggregates: any[] = []

    // rewrite a DESCRIBE query into a CONSTRUCT query
    if (query.queryType === 'DESCRIBE') {
      const template: Algebra.TripleObject[] = []
      const where: any = [{
        type: 'bgp',
        triples: []
      }]
      query.variables!.forEach((v: any) => {
        const triple = rdf.triple(v, `?pred__describe__${v}`, `?obj__describe__${v}`)
        template.push(triple)
        where[0].triples.push(triple)
      })
      const construct = {
        prefixes: query.prefixes,
        from: query.from,
        queryType: 'CONSTRUCT',
        template,
        type: 'query',
        where: query.where.concat(where)
      }
      return this._buildQueryPlan(construct, context, source)
    }

    // from the begining, dectect any LIMIT/OFFSET modifiers, as they cimpact the caching strategy
    context.setProperty(ContextSymbols.HAS_LIMIT_OFFSET, 'limit' in query || 'offset' in query)

    // Handles FROM clauses
    if (query.from) {
      context.defaultGraphs = query.from.default
      context.namedGraphs = query.from.named
    }

    // Handles WHERE clause
    let graphIterator: PipelineStage<Bindings>
    if (query.where.length > 0) {
      graphIterator = this._buildWhere(source, query.where, context)
    } else {
      graphIterator = engine.of(new BindingBase())
    }

    // Parse query variable to separate projection & aggregate variables
    if ('variables' in query) {
      const parts = partition(query.variables, v => isString(v))
      aggregates = parts[1]
      // add aggregates variables to projection variables
      query.variables = parts[0].concat(aggregates.map(agg => (agg as Algebra.Aggregation).variable))
    }

    // Handles SPARQL aggregations
    if ('group' in query || aggregates.length > 0) {
      // Handles GROUP BY
      graphIterator = this._stageBuilders.get(SPARQL_OPERATION.AGGREGATE)!.execute(graphIterator, query, context, this._customFunctions) as PipelineStage<Bindings>
    }

    if (aggregates.length > 0) {
      // Handles SPARQL aggregation functions
      graphIterator = aggregates.reduce((prev: PipelineStage<Bindings>, agg: Algebra.Aggregation) => {
        const op = this._stageBuilders.get(SPARQL_OPERATION.BIND)!.execute(prev, agg, this._customFunctions, context)
        return op as PipelineStage<Bindings>
      }, graphIterator)
    }

    // Handles ORDER BY
    if ('order' in query) {
      if (!this._stageBuilders.has(SPARQL_OPERATION.ORDER_BY)) {
        throw new Error('A PlanBuilder cannot evaluate SPARQL ORDER BY clauses without a StageBuilder for it')
      }
      graphIterator = this._stageBuilders.get(SPARQL_OPERATION.ORDER_BY)!.execute(graphIterator, query.order!) as PipelineStage<Bindings>
    }

    if (!(query.queryType in QUERY_MODIFIERS)) {
      throw new Error(`Unsupported SPARQL query type: ${query.queryType}`)
    }
    graphIterator = QUERY_MODIFIERS[query.queryType](graphIterator, query, context)

    // Create iterators for modifiers
    if (query.distinct) {
      if (!this._stageBuilders.has(SPARQL_OPERATION.DISTINCT)) {
        throw new Error('A PlanBuilder cannot evaluate a DISTINCT clause without a StageBuilder for it')
      }
      graphIterator = this._stageBuilders.get(SPARQL_OPERATION.DISTINCT)!.execute(graphIterator, context) as PipelineStage<Bindings>
    }

    // Add offsets and limits if requested
    if ('offset' in query) {
      graphIterator = engine.skip(graphIterator, query.offset!)
    }
    if ('limit' in query) {
      graphIterator = engine.limit(graphIterator, query.limit!)
    }
    // graphIterator.queryType = query.queryType
    return graphIterator
  }

  /**
   * Optimize a WHERE clause and build the corresponding physical plan
   * @param  source  - Input {@link PipelineStage}
   * @param  groups   - WHERE clause to process
   * @param  options  - Execution options
   * @return A {@link PipelineStage} used to evaluate the WHERE clause
   */
  _buildWhere (source: PipelineStage<Bindings>, groups: Algebra.PlanNode[], context: ExecutionContext): PipelineStage<Bindings> {
    groups = sortBy(groups, g => {
      switch (g.type) {
        case 'graph':
          if (rdf.isVariable((g as Algebra.GraphNode).name)) {
            return 5
          }
          return 0
        case 'bgp':
          return 0
        case 'values':
          return 3
        case 'filter':
          return 4
        default:
          return 1
      }
    })

    // Handle VALUES clauses using query rewriting
    if (some(groups, g => g.type === 'values')) {
      return this._buildValues(source, groups, context)
    }

    // merge BGPs on the same level
    // let newGroups = []
    // let prec = null
    // for (let i = 0; i < groups.length; i++) {
    //   let group = groups[i]
    //   if (group.type === 'bgp' && prec !== null && prec.type === 'bgp') {
    //     let lastGroup = newGroups[newGroups.length - 1] as Algebra.BGPNode
    //     lastGroup.triples = lastGroup.triples.concat((group as Algebra.BGPNode).triples)
    //   } else {
    //     newGroups.push(group)
    //   }
    //   prec = groups[i]
    // }
    // groups = newGroups

    return groups.reduce((source, group) => {
      return this._buildGroup(source, group, context)
    }, source)
  }

  /**
   * Build a physical plan for a SPARQL group clause
   * @param  source  - Input {@link PipelineStage}
   * @param  group   - SPARQL Group
   * @param  options - Execution options
   * @return A {@link PipelineStage} used to evaluate the SPARQL Group
   */
  _buildGroup (source: PipelineStage<Bindings>, group: Algebra.PlanNode, context: ExecutionContext): PipelineStage<Bindings> {
    const engine = Pipeline.getInstance()
    // Reset flags on the options for child iterators
    let childContext = context.clone()

    switch (group.type) {
      case 'bgp':
        // gather metadata about triple patterns
        let triples = []
        for (let triple of (group as Algebra.BGPNode).triples) {
          let selectivity = 0
          if (typeof triple.predicate === "string") {
            if (triple.subject.startsWith('?')) {
              selectivity += 1
            }
            if (triple.predicate.startsWith('?')) {
              selectivity += 1
            }
            if (triple.object.startsWith('?')) {
              selectivity += 1
            }
          } else if (triple.subject.startsWith('?') && triple.object.startsWith('?')) {
            if (isTransitiveClosure(triple.predicate)) {
              selectivity = 5
            } else {
              selectivity = 4
            }
          }
          triples.push({
            triple: triple,
            selectivity: selectivity
          })
        }
        console.log(triples)
        // sort triples by ascending selectivity
        triples = triples.sort((a, b) => a.selectivity - b.selectivity).map((pattern) => pattern.triple)
        // evaluate patterns using the appropriate stage builder
        let bucket = []
        let variables = []
        let triple = triples.shift()
        bucket.push(triple!)
        variables.push(...getVariables(triple!))
        let is_path_bucket = (typeof triple!.predicate !== "string")
        while (triples.length > 0) {
          let position = findConnectedPattern(variables, triples)
          if (position < 0) {
            position = 0  
          }
          triple = triples[position]
          triples.splice(position, 1)
          variables.push(...getVariables(triple!))
          if (is_path_bucket === (typeof triple!.predicate !== "string")) {
            bucket.push(triple)
          } else {
            console.log(bucket)
            if (is_path_bucket) {
              if (!this._stageBuilders.has(SPARQL_OPERATION.PROPERTY_PATH)) {
                throw new Error('A PlanBuilder cannot evaluate property paths without a Stage Builder for it')
              }
              source = this._stageBuilders.get(SPARQL_OPERATION.PROPERTY_PATH)!.execute(source, bucket, context) as PipelineStage<Bindings>
            } else {
              if (!this._stageBuilders.has(SPARQL_OPERATION.BGP)) {
                throw new Error('A PlanBuilder cannot evaluate a Basic Graph Pattern without a Stage Builder for it')
              }
              source = this._stageBuilders.get(SPARQL_OPERATION.BGP)!.execute(source, bucket, context) as PipelineStage<Bindings>
            }
            bucket = [triple]
            is_path_bucket = !is_path_bucket
          }
        }
        if (bucket.length > 0) {
          console.log(bucket)
          if (is_path_bucket) {
            if (!this._stageBuilders.has(SPARQL_OPERATION.PROPERTY_PATH)) {
              throw new Error('A PlanBuilder cannot evaluate property paths without a Stage Builder for it')
            }
            source = this._stageBuilders.get(SPARQL_OPERATION.PROPERTY_PATH)!.execute(source, bucket, context) as PipelineStage<Bindings>
          } else {
            if (!this._stageBuilders.has(SPARQL_OPERATION.BGP)) {
              throw new Error('A PlanBuilder cannot evaluate a Basic Graph Pattern without a Stage Builder for it')
            }
            source = this._stageBuilders.get(SPARQL_OPERATION.BGP)!.execute(source, bucket, context) as PipelineStage<Bindings>
          }
        }
        return source
      case 'query':
        return this._buildQueryPlan(group as Algebra.RootNode, childContext, source)
      case 'graph':
        if (!this._stageBuilders.has(SPARQL_OPERATION.GRAPH)) {
          throw new Error('A PlanBuilder cannot evaluate a GRAPH clause without a Stage Builder for it')
        }
        // delegate GRAPH evaluation to an executor
        return this._stageBuilders.get(SPARQL_OPERATION.GRAPH)!.execute(source, group as Algebra.GraphNode, childContext) as PipelineStage<Bindings>
      case 'service':
        if (!this._stageBuilders.has(SPARQL_OPERATION.SERVICE)) {
          throw new Error('A PlanBuilder cannot evaluate a SERVICE clause without a Stage Builder for it')
        }
        return this._stageBuilders.get(SPARQL_OPERATION.SERVICE)!.execute(source, group as Algebra.ServiceNode, childContext) as PipelineStage<Bindings>
      case 'group':
        return this._buildWhere(source, (group as Algebra.GroupNode).patterns, childContext)
      case 'optional':
        if (!this._stageBuilders.has(SPARQL_OPERATION.OPTIONAL)) {
          throw new Error('A PlanBuilder cannot evaluate an OPTIONAL clause without a Stage Builder for it')
        }
        return this._stageBuilders.get(SPARQL_OPERATION.OPTIONAL)!.execute(source, group, childContext) as PipelineStage<Bindings>
      case 'union':
        if (!this._stageBuilders.has(SPARQL_OPERATION.UNION)) {
          throw new Error('A PlanBuilder cannot evaluate an UNION clause without a Stage Builder for it')
        }
        return this._stageBuilders.get(SPARQL_OPERATION.UNION)!.execute(source, group, childContext) as PipelineStage<Bindings>
      case 'minus':
        if (!this._stageBuilders.has(SPARQL_OPERATION.MINUS)) {
          throw new Error('A PlanBuilder cannot evaluate a MINUS clause without a Stage Builder for it')
        }
        return this._stageBuilders.get(SPARQL_OPERATION.MINUS)!.execute(source, group, childContext) as PipelineStage<Bindings>
      case 'filter':
        if (!this._stageBuilders.has(SPARQL_OPERATION.FILTER)) {
          throw new Error('A PlanBuilder cannot evaluate a FILTER clause without a Stage Builder for it')
        }
        return this._stageBuilders.get(SPARQL_OPERATION.FILTER)!.execute(source, group, this._customFunctions, childContext) as PipelineStage<Bindings>
      case 'bind':
        if (!this._stageBuilders.has(SPARQL_OPERATION.BIND)) {
          throw new Error('A PlanBuilder cannot evaluate a BIND clause without a Stage Builder for it')
        }
        return this._stageBuilders.get(SPARQL_OPERATION.BIND)!.execute(source, (group as Algebra.BindNode), this._customFunctions, childContext) as PipelineStage<Bindings>
      default:
        throw new Error(`Unsupported SPARQL group pattern found in query: ${group.type}`)
    }
  }

  /**
   * Build a {@link PipelineStage} which evaluates a SPARQL query with VALUES clause(s).
   * It rely on a query rewritiing approach:
   * ?s ?p ?o . VALUES ?s { :1 :2 } becomes {:1 ?p ?o BIND(:1 AS ?s)} UNION {:2 ?p ?o BIND(:2 AS ?s)}
   * @param source  - Input {@link PipelineStage}
   * @param groups  - Query body, i.e., WHERE clause
   * @param options - Execution options
   * @return A {@link PipelineStage} which evaluates a SPARQL query with VALUES clause(s)
   */
  _buildValues (source: PipelineStage<Bindings>, groups: Algebra.PlanNode[], context: ExecutionContext): PipelineStage<Bindings> {
    let [ values, others ] = partition(groups, g => g.type === 'values')
    const bindingsLists = values.map(g => (g as Algebra.ValuesNode).values)
    // for each VALUES clause
    const iterators = bindingsLists.map(bList => {
      // for each value to bind in the VALUES clause
      const unionBranches = bList.map(b => {
        const bindings = BindingBase.fromObject(b)
        // BIND each group with the set of bindings and then evaluates it
        const temp = others.map(g => deepApplyBindings(g, bindings))
        return extendByBindings(this._buildWhere(source, temp, context), bindings)
      })
      return Pipeline.getInstance().merge(...unionBranches)
    })
    // Users may use more than one VALUES clause
    if (iterators.length > 1) {
      return Pipeline.getInstance().merge(...iterators)
    }
    return iterators[0]
  }
}
