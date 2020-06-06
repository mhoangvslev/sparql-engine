import PathStageBuilder from "../path-stage-builder";
import { Graph, ExecutionContext, PipelineStage, Pipeline, rdf, PipelineEngine } from "../../../api";
import { BuilderAlgebra, Algebra } from "sparqljs";
import { AutomatonBuilder } from "./automaton-builder/builder";
import { PathsContractionOptimizer } from "./automaton-optimizer/paths-contraction";
import { Automaton } from "./automaton-model/automaton";
import { State } from "./automaton-model/automaton-state";
import { Transition } from "./automaton-model/automaton-transition";
import { Bindings } from "../../../rdf/bindings";


export class SearchState {    
    private _subject: string
    private _object: string
    private _state: State

    constructor(subject: string, object: string, state: State) {
        this._subject = subject
        this._object = object
        this._state = state
    }

    get subject(): string {
        return this._subject
    }

    set subject(subject: string) {
        this._subject = subject
    }

    get object(): string {
        return this._object
    }

    get state(): State {
        return this._state
    }

    set state(state: State) {
        this._state = state
    }

    public copy(): SearchState {
        return new SearchState(this.subject, this.object, this.state)
    }

    public toString(): string {
        return `{subject: ${this._subject}, object: ${this._object}, state: ${this._state.name}}`
    }
}

export class VisitedNode {
    private _visited: Map<string, string>

    constructor() {
        this._visited = new Map<string, string>()
    }

    public contains(node: string): boolean {
        return this._visited.has(node)
    }

    public add(node: string): void {
        this._visited.set(node, node)
    }

    public print(): void {
        console.log(this._visited)
    }
}

/**
 * A GlushkovStageBuilder is responsible for evaluation a SPARQL Property path query using a Glushkov state automaton.
 * @author Julien Aimonier-Davat
 */
export default class TythorStageBuilder extends PathStageBuilder {
    
    protected buildFilter (variable: string, predicates: Array<string>): Algebra.FilterNode {
        let node: Algebra.FilterNode = {
            type: 'filter',
            expression: {
                type: 'operation',
                operator: '!=',
                args: [variable, predicates[0]]
            }
        }
        for (let i = 1; i < predicates.length; i++) {
            let expression: Algebra.SPARQLExpression = {
                type: 'operation',
                operator: '&&',
                args: [node.expression, {
                    type: 'operation',
                    operator: '!=',
                    args: [variable, predicates[i]]
                }]
            }
            node.expression = expression
        }
        return node
    }

    protected buildQuery(subject: string, object: string, transition: Transition, joinPrefix: string = 'tythorJoin', filterPrefix: string = 'tythorFilter'): Algebra.RootNode {
        let triples = new Array<Algebra.TripleObject>()
        let filters = new Array<Algebra.FilterNode>()
        
        let joinVar = 0
        let filterVar = 0

        for (let index = 0, len = transition.instructions.length; index < len; index++) {
            let tripleSubject = (index === 0) ? subject : `?${joinPrefix}_${joinVar}`
            let tripleObject = (index === len - 1) ? object : `?${joinPrefix}_${joinVar + 1}`
            let instruction = transition.instructions[index]
            triples.push({
                subject: instruction.inverse ? tripleObject : tripleSubject,
                predicate: instruction.negation ? `?${filterPrefix}_${filterVar}` : instruction.properties[0],
                object: instruction.inverse ? tripleSubject : tripleObject
            })
            if (instruction.negation) {
                filters.push(this.buildFilter(`?${filterPrefix}_${filterVar}`, instruction.properties))
            }
            joinVar++
            filterVar++
        }

        let bgp: Algebra.BGPNode = {
            type: 'bgp',
            triples: triples
        }
        let group: Algebra.GroupNode = {
            type: 'group',
            patterns: [bgp, ...filters]
        }
        let query: Algebra.RootNode = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: {},
            variables: [subject, object].filter((variable) => rdf.isVariable(variable)),
            where: [group]
        }
        return query
    }

    private isSolution(searchState: SearchState, subject: string, object: string): boolean {
        if (rdf.isVariable(subject) && rdf.isVariable(object)) {
            if (subject === object) {
                return searchState.subject === searchState.object
            } else {
                return true
            }
        }
        return rdf.isVariable(object) ? true : (searchState.object === object)
    }

    protected evalTransition(searchState: SearchState, transition: Transition, graph: Graph, context: ExecutionContext): PipelineStage<SearchState> {
        let engine: PipelineEngine = Pipeline.getInstance()
        let query = this.buildQuery(searchState.object, '?tythorObject', transition)
        return engine.map(graph.evalQuery(query, context), (solution: Bindings) => {
            return new SearchState(searchState.subject, solution.get('?tythorObject')!, transition.to)
        })
    }

    protected computeNextStep(searchState: SearchState, subject: string, object: string, visited: VisitedNode, automaton: Automaton, graph: Graph, context: ExecutionContext): PipelineStage<SearchState> {
        let engine: PipelineEngine = Pipeline.getInstance()

        let newSolution = engine.empty<SearchState>()
        if (searchState.state.isFinal) {
            if (this.isSolution(searchState, subject, object) && !visited.contains(searchState.object)) {
                newSolution = engine.of(searchState)
                if (!rdf.isVariable(object)) {
                    return newSolution
                }
            }
            
            if (visited.contains(searchState.object)) {
                return engine.empty<SearchState>()
            } else {
                visited.add(searchState.object)
            }
            
        }

        let nextSolutions = engine.mergeMap(engine.from(automaton.findTransitionsFrom(searchState.state)), (transition: Transition) => {
            return engine.mergeMap(this.evalTransition(searchState, transition, graph, context), (result: SearchState) => {
                return this.computeNextStep(result, subject, object, visited, automaton, graph, context)
            })
        })

        return engine.merge(newSolution, nextSolutions)
    }

    protected computeFirstStep(subject: string, object: string, automaton: Automaton, graph: Graph, context: ExecutionContext): PipelineStage<SearchState> {
        let engine = Pipeline.getInstance()
        let initialState = automaton.findInitialStates()[0]

        let visitedMaps = new Map<string, VisitedNode>()

        return engine.mergeMap(engine.from(automaton.findTransitionsFrom(initialState)), (transition: Transition) => {           
            let query = this.buildQuery(rdf.isVariable(subject) ? '?tythorSubject' : subject, '?tythorObject', transition)
            return engine.mergeMap(graph.evalQuery(query, context), (solution: Bindings) => {
                let solutionSubject = rdf.isVariable(subject) ? solution.get('?tythorSubject')! : subject
                let solutionObject = solution.get('?tythorObject')!
                let searchState = new SearchState(solutionSubject, solutionObject, transition.to)
                
                if (!visitedMaps.has(solutionSubject)) {
                    let visited = new VisitedNode()
                    if (initialState.isFinal) {
                        visited.add(solutionSubject)
                    }
                    visitedMaps.set(solutionSubject, visited)
                }

                return this.computeNextStep(searchState, subject, object, visitedMaps.get(solutionSubject)!, automaton, graph, context)
            })
        })
    }

    protected reflexiveClosure(subject: string, object: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        let engine = Pipeline.getInstance()

        if (rdf.isVariable(subject) && !rdf.isVariable(object)) {
            return engine.of({
                subject: object,
                predicate: "",
                object: object
            })
        } else if (!rdf.isVariable(subject) && rdf.isVariable(object)) {
            return engine.of({
                subject: subject,
                predicate: "",
                object: subject
            })
        } else if (rdf.isVariable(subject) && rdf.isVariable(object)) {
            let bgp: Algebra.TripleObject[] = [{subject: '?s', predicate: '?p', object: '?o'}]
            return engine.distinct(engine.mergeMap(graph.evalBGP(bgp, context), (bindings: Bindings) => {
                let subjectMapping = bindings.get('?s')!
                let objectMapping = bindings.get('?o')!
                return engine.of({
                    subject: subjectMapping,
                    predicate: "",
                    object: subjectMapping
                }, {
                    subject: objectMapping,
                    predicate: "",
                    object: objectMapping
                })
            }), (step: Algebra.TripleObject) => step.subject)
        } else if (subject === object) {
            return engine.of({
                subject: subject,
                predicate: "",
                object: object
            })
        } else {
            return engine.empty<Algebra.TripleObject>()
        }
    }
    
    _executePropertyPath(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        let engine = Pipeline.getInstance()
        let forward = !rdf.isVariable(subject) || (rdf.isVariable(subject) && rdf.isVariable(obj))
        
        let automaton = new AutomatonBuilder().build(path as BuilderAlgebra.PropertyPath, forward)
        let optimizedAutomaton = new PathsContractionOptimizer().optimize(automaton)
        let nbResults = 0
        let transitiveClosureSolutions = engine.map(
            this.computeFirstStep(forward ? subject : obj, forward ? obj : subject, optimizedAutomaton, graph, context), (solution: SearchState) => {
                let triple: Algebra.TripleObject
                if (forward) {
                    triple = {
                        subject: solution.subject,
                        predicate: "",
                        object: solution.object
                    }
                } else {
                    triple = {
                        subject: solution.object,
                        predicate: "",
                        object: solution.subject
                    }
                }
                console.log(`Update number of results: ${++nbResults}`)
                return triple
            }
        )

        let reflexiveClosureSolutions = engine.empty<Algebra.TripleObject>()
        let initialState = optimizedAutomaton.findInitialStates()[0]
        if (initialState.isFinal) {
            reflexiveClosureSolutions = this.reflexiveClosure(subject, obj, graph, context)
        }

        return engine.merge(transitiveClosureSolutions, reflexiveClosureSolutions)
    }
    
}