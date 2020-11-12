import { Pipeline, rdf, ExecutionContext, Graph, PipelineStage, Bindings, PipelineEngine } from "../../../../api"
import { Algebra } from "sparqljs"
import { Transition } from "../automaton-model/transition"
import { Automaton } from "../automaton-model/automaton"
import { TythorContext } from "./tythor-context"
import { TythorState } from "./tythor-state"
import { ClosureTransition } from "../automaton-model/closure-transition"
import { isClosureTransition, isClosureNode } from "../utils"

/**
 * @author Julien Aimonier-Davat
 * Evaluates path expressions using a set semantics. This engine must be used
 * to compute transitive closure expressions. Non-transitive expressions must
 * have been rewritten during the optimization of the query plan.
 */
export class TyThorEngine {

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

    protected evalTransition(searchState: TythorState, transition: Transition | ClosureTransition<Transition>, graph: Graph, context: ExecutionContext): PipelineStage<TythorState> {
        let engine: PipelineEngine = Pipeline.getInstance()
        if (isClosureTransition(transition)) {
            let ppContext = new TythorContext(searchState.object, '?o', true)
            let nestedSearchState = new TythorState(searchState.object, searchState.object, transition.automaton.findInitialStates()[0])
            return engine.map(this.computeNextStep(nestedSearchState, transition.automaton, graph, ppContext, context), (solution: TythorState) => {
                return new TythorState(searchState.subject, solution.object, transition.to)
            })
        } else {
            let query = transition.buildQuery(searchState.object, '?tythorObject')
            return engine.map(graph.evalQuery(query, context), (solution: Bindings) => {
                return new TythorState(searchState.subject, solution.get('?tythorObject')!, transition.to)
            })
        }   
    }

    protected computeNextStep(searchState: TythorState, automaton: Automaton<Transition>, graph: Graph, ppContext: TythorContext, context: ExecutionContext): PipelineStage<TythorState> {
        let engine: PipelineEngine = Pipeline.getInstance()

        if (ppContext.stop) {
            return engine.empty<TythorState>()
        }

        let newSolution = engine.empty<TythorState>()
        if (searchState.state.isFinal) {
            if (!ppContext.visited(searchState.subject, searchState.object) && ppContext.isSolution(searchState.subject, searchState.object)) {
                newSolution = engine.of(searchState)
            }

            if (ppContext.visited(searchState.subject, searchState.object)) {
                return engine.empty<TythorState>()
            } else {
                ppContext.visit(searchState.subject, searchState.object)
            }
        }

        let nextSolutions = engine.mergeMap(engine.from(automaton.findTransitionsFrom(searchState.state)), (transition: Transition | ClosureTransition<Transition>) => {
            return engine.mergeMap(this.evalTransition(searchState, transition, graph, context), (result: TythorState) => {
                return this.computeNextStep(result, automaton, graph, ppContext, context)
            })
        })

        return engine.merge(newSolution, nextSolutions)
    }

    protected findCandidates(automaton: Automaton<Transition>, graph: Graph, context: ExecutionContext): PipelineStage<string> {
        let engine = Pipeline.getInstance()
        let initialState = automaton.findInitialStates()[0]

        return engine.mergeMap(engine.from(automaton.findTransitionsFrom(initialState)), (transition: Transition | ClosureTransition<Transition>) => {
            if (isClosureTransition(transition)) {
                return this.findCandidates(transition.automaton, graph, context)
            } else {
                let query = transition.buildQuery('?tythorSubject', '?tythorObject')
                return engine.mergeMap(graph.evalQuery(query, context), (solution: Bindings) => {
                    return engine.of<string>(solution.get('?tythorSubject')!)
                })
            }
        })
    }

    protected computeFirstStep(subject: string, automaton: Automaton<Transition>, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<TythorState> {
        let engine = Pipeline.getInstance()
        let initialState = automaton.findInitialStates()[0]
        if (rdf.isVariable(subject)) {
            return engine.mergeMap(engine.distinct(this.findCandidates(automaton, graph, context)), (candidate: string) => {
                let ppContext: TythorContext = new TythorContext(candidate, obj)
                let searchState = new TythorState(candidate, candidate, initialState)
                return this.computeNextStep(searchState, automaton, graph, ppContext, context)
            })
        } else {
            let ppContext: TythorContext = new TythorContext(subject, obj)
            let searchState = new TythorState(subject, subject, initialState)
            return this.computeNextStep(searchState, automaton, graph, ppContext, context)
        }
    }

    public evalPropertyPaths(subject: string, automaton: Automaton<Transition>, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        let engine = Pipeline.getInstance()
        let initialState = automaton.findInitialStates()[0]
        let solutions = engine.map(engine.filter(this.computeFirstStep(subject, automaton, obj, graph, context), (solution: TythorState) => {
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