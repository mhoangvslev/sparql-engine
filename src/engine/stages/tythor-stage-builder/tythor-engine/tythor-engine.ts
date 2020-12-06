import { Pipeline, rdf, ExecutionContext, Graph, PipelineStage, Bindings, PipelineEngine } from "../../../../api"
import { Algebra } from "sparqljs"
import { Transition } from "../automaton-model/transition"
import { Automaton } from "../automaton-model/automaton"
import { TythorContext } from "./tythor-context"
import { TythorState } from "./tythor-state"
import { TransitiveTransition } from "../automaton-model/transitive-transition"

/**
 * @author Julien Aimonier-Davat
 * Evaluates path expressions using a set semantics. This engine must be used
 * to compute transitive closure expressions. Non-transitive expressions must
 * have been rewritten during the optimization of the query plan.
 */
export class TyThorEngine {

    private _maxDepth: number|undefined

    constructor(maxDepth?: number) {
        this._maxDepth = maxDepth
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

    protected evalTransition(searchState: TythorState, transition: Transition | TransitiveTransition, graph: Graph, context: ExecutionContext): PipelineStage<TythorState> {
        let engine: PipelineEngine = Pipeline.getInstance()
        return engine.map(transition.eval(searchState.object, '?tythorObject', graph, context), (solution: Bindings) => {
            return new TythorState(searchState.subject, solution.get('?tythorObject')!, transition.to, searchState.depth + 1)
        })
    }

    protected evalNext(searchState: TythorState, automaton: Automaton<Transition>, graph: Graph, ppContext: TythorContext, context: ExecutionContext): PipelineStage<TythorState> {
        let engine: PipelineEngine = Pipeline.getInstance()

        if (ppContext.stop || ppContext.visited(searchState) || (this._maxDepth && searchState.depth > this._maxDepth)) {
            return engine.empty<TythorState>()
        }

        let newSolution = engine.empty<TythorState>()
        if (searchState.state.isFinal) {
            ppContext.mark_as_visited(searchState)
            if (ppContext.isSolution(searchState)) {
                newSolution = engine.of(searchState)
            }
        }

        let nextSolutions = engine.mergeMap(engine.from(automaton.findTransitionsFrom(searchState.state)), (transition: Transition | TransitiveTransition) => {
            return engine.mergeMap(this.evalTransition(searchState, transition, graph, context), (result: TythorState) => {
                return this.evalNext(result, automaton, graph, ppContext, context)
            })
        })

        return engine.merge(newSolution, nextSolutions)
    }

    protected findCandidates(automaton: Automaton<Transition>, graph: Graph, context: ExecutionContext): PipelineStage<string> {
        let engine = Pipeline.getInstance()
        let initialState = automaton.findInitialStates()[0]

        return engine.mergeMap(engine.from(automaton.findTransitionsFrom(initialState)), (transition: Transition | TransitiveTransition) => {
            return engine.mergeMap(transition.eval('?tythorSubject', '?tythorObject', graph, context), (solution: Bindings) => {
                return engine.of<string>(solution.get('?tythorSubject')!)
            })
        })
    }

    protected eval(subject: string, automaton: Automaton<Transition>, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<TythorState> {
        let engine = Pipeline.getInstance()
        let initialState = automaton.findInitialStates()[0]
        if (rdf.isVariable(subject)) {
            return engine.mergeMap(engine.distinct(this.findCandidates(automaton, graph, context)), (candidate: string) => {
                let ppContext: TythorContext = new TythorContext(candidate, obj)
                let searchState = new TythorState(candidate, candidate, initialState, 0)
                return this.evalNext(searchState, automaton, graph, ppContext, context)
            })
        } else {
            let ppContext: TythorContext = new TythorContext(subject, obj)
            let searchState = new TythorState(subject, subject, initialState, 0)
            return this.evalNext(searchState, automaton, graph, ppContext, context)
        }
    }

    public evalPropertyPaths(subject: string, automaton: Automaton<Transition>, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        let engine = Pipeline.getInstance()
        let initialState = automaton.findInitialStates()[0]
        let solutions = engine.map(engine.filter(this.eval(subject, automaton, obj, graph, context), (solution: TythorState) => {
            return !initialState.isFinal || solution.subject !== solution.object
        }), (solution: TythorState) => {
            return {
                subject: solution.subject,
                predicate: "",
                object: solution.object
            }
        })

        let reflexiveClosureSolutions = engine.empty<Algebra.TripleObject>()
        if (initialState.isFinal) {
            reflexiveClosureSolutions = this.reflexiveClosure(subject, obj, graph, context)
        }

        return engine.merge(solutions, reflexiveClosureSolutions)
    }
}