import { Graph, ExecutionContext, PipelineStage, Pipeline, PipelineEngine } from "../../../api";
import { Algebra } from "sparqljs";
import { Transition } from "./automaton-model/automaton-transition";
import { Bindings } from "../../../rdf/bindings";
import TythorStageBuilder from "./tythor-stage-builder";
import { SearchState, VisitedNode } from "./tythor-stage-builder";
import { StreamPipelineInput } from "../../pipeline/pipeline-engine";

/**
 * A GlushkovStageBuilder is responsible for evaluation a SPARQL Property path query using a Glushkov state automaton.
 * @author Julien Aimonier-Davat
 */
export default class TythorStarOptStageBuilder extends TythorStageBuilder {
    
    protected mergeQueries(left: Algebra.RootNode, right: Algebra.RootNode): Algebra.RootNode {
        let bgp: Algebra.BGPNode = {
            type: 'bgp',
            triples: [
                ...((left.where[0] as Algebra.GroupNode).patterns[0] as Algebra.BGPNode).triples,
                ...((right.where[0] as Algebra.GroupNode).patterns[0] as Algebra.BGPNode).triples
            ]
        }
        let group: Algebra.GroupNode = {
            type: 'group',
            patterns: [bgp,
                ...((left.where[0] as Algebra.GroupNode).patterns.slice(1)),
                ...((right.where[0] as Algebra.GroupNode).patterns.slice(1))
            ]
        }
        let query: Algebra.RootNode = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: {},
            variables: ['?tythorObject'],
            where: [group]
        }
        return query
    }

    protected buildStarQuery(subject: string, object: string, transition: Transition, depth: number): Algebra.RootNode {
        if (depth === 1) {
            return this.buildQuery(subject, object, transition, `joinPrefix_${depth}`, `filterPrefix_${depth}`)
        }
        let varIndex = 0
        let query = this.buildQuery(subject, `?tythorStarVar_${varIndex}`, transition, `joinPrefix_${1}`, `filterPrefix_${1}`)
        for (let i = 2; i < depth; i++) {
            query = this.mergeQueries(query, this.buildQuery(`?tythorStarVar_${varIndex}`, `?tythorStarVar_${++varIndex}`, transition, `joinPrefix_${i}`, `filterPrefix_${i}`))
        }
        return this.mergeQueries(query, this.buildQuery(`?tythorStarVar_${varIndex}`, object, transition, `joinPrefix_${depth}`, `filterPrefix_${depth}`))
    }

    protected evalQuery(query: Algebra.RootNode, graph: Graph, context: ExecutionContext): Promise<Array<string>> {
        let solutions = new Array<string>()
        return new Promise((resolve, reject) => {
            graph.evalQuery(query, context).subscribe((solution: Bindings) => {
                console.log(solution)
                solutions.push(solution.get('?tythorObject')!)
            }, (err: any) => {
                reject(err)
            }, () => {
                resolve(solutions)
            })
        })
    }

    protected async evalStarTransition(searchState: SearchState, input: StreamPipelineInput<SearchState>, transition: Transition, graph: Graph, context: ExecutionContext): Promise<void> {
        let queue = new Array<SearchState>()
        let visited = new VisitedNode()
        queue.push(searchState)

        while (queue.length > 0) {
            let currentSearchState = queue.shift()!
            let depth = 0
            let nbSolution = 0
            let nbDuplicate = 0
            let solutions = new Array<SearchState>()
            do {
                depth++
                nbSolution = 0
                nbDuplicate = 0
                solutions = new Array<SearchState>()
                let query = this.buildStarQuery(currentSearchState.object, '?tythorObject', transition, depth)
                let queryResults = await this.evalQuery(query, graph, context)
                for (let solution of queryResults) {
                    if (visited.contains(solution)) {
                        nbDuplicate++
                    } else {
                        visited.add(solution)
                        let newSearchState = new SearchState(currentSearchState.subject, solution, transition.to)
                        input.next(newSearchState)
                        solutions.push(newSearchState)
                        nbSolution++
                    }
                }
            } while (nbSolution > 0 && ((nbDuplicate / (nbSolution + nbDuplicate)) * 100) <= 0)
            
            if (nbSolution > 0) {
                queue.push(...solutions)
            }
        }
        input.complete()
    }

    protected evalTransition(searchState: SearchState, transition: Transition, graph: Graph, context: ExecutionContext): PipelineStage<SearchState> {
        let engine: PipelineEngine = Pipeline.getInstance()
        if (transition.from.equals(transition.to)) {
            return engine.fromAsync(input => {
                this.evalStarTransition(searchState, input, transition, graph, context)
            })
        } else {
            let query = this.buildQuery(searchState.object, '?tythorObject', transition)
            return engine.map(graph.evalQuery(query, context), (solution: Bindings) => {
                return new SearchState(searchState.subject, solution.get('?tythorObject')!, transition.to)
            })
        }
    }
}