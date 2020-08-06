import { Pipeline, rdf, ExecutionContext, Graph, PipelineStage, Bindings, PipelineEngine } from "../../../../api"
import { Algebra } from "sparqljs"
import { Transition } from "../automaton-model/transition"
import { Automaton } from "../automaton-model/automaton"
import { TythorContext } from "./tythor-context"
import { TythorState } from "./tythor-state"


/**
 * @author Julien Aimonier-Davat
 * Evaluates path expressions using a set semantics. This engine must be used
 * to compute transitive closure expressions. Non-transitive expressions must
 * have been rewritten during the optimization of the query plan.
 */
export class TyThorEngine {

    protected evalTransition(searchState: TythorState, transition: Transition, graph: Graph, context: ExecutionContext): PipelineStage<TythorState> {
        let engine: PipelineEngine = Pipeline.getInstance()
        let query = transition.buildQuery(searchState.object, '?tythorObject')
        return engine.map(graph.evalQuery(query, context), (solution: Bindings) => {
            return new TythorState(searchState.subject, solution.get('?tythorObject')!, transition.to)
        })
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

        let nextSolutions = engine.mergeMap(engine.from(automaton.findTransitionsFrom(searchState.state)), (transition: Transition) => {
            return engine.mergeMap(this.evalTransition(searchState, transition, graph, context), (result: TythorState) => {
                return this.computeNextStep(result, automaton, graph, ppContext, context)
            })
        })

        return engine.merge(newSolution, nextSolutions)
    }

    protected computeFirstStep(automaton: Automaton<Transition>, graph: Graph, ppContext: TythorContext, context: ExecutionContext): PipelineStage<TythorState> {
        let engine = Pipeline.getInstance()
        let initialState = automaton.findInitialStates()[0]

        return engine.mergeMap(engine.from(automaton.findTransitionsFrom(initialState)), (transition: Transition) => {           
            let query = transition.buildQuery(rdf.isVariable(ppContext.subject) ? '?tythorSubject' : ppContext.subject, '?tythorObject')
            return engine.mergeMap(graph.evalQuery(query, context), (solution: Bindings) => {
                let solutionSubject = rdf.isVariable(ppContext.subject) ? solution.get('?tythorSubject')! : ppContext.subject
                let solutionObject = solution.get('?tythorObject')!
                let searchState = new TythorState(solutionSubject, solutionObject, transition.to)
                
                if (initialState.isFinal) {
                    ppContext.visit(solutionSubject, solutionSubject)
                }
                
                return this.computeNextStep(searchState, automaton, graph, ppContext, context)
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

    public evalPropertyPaths(subject: string, automaton: Automaton<Transition>, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        let engine = Pipeline.getInstance()

        let ppContext: TythorContext = new TythorContext(subject, obj)

        let transitiveClosureSolutions = engine.map(this.computeFirstStep(automaton, graph, ppContext, context), (solution: TythorState) => {
            return {
                subject: solution.subject,
                predicate: "",
                object: solution.object
            }
        })

        let reflexiveClosureSolutions = engine.empty<Algebra.TripleObject>()
        let initialState = automaton.findInitialStates()[0]
        if (initialState.isFinal) {
            reflexiveClosureSolutions = this.reflexiveClosure(subject, obj, graph, context)
        }

        return engine.merge(transitiveClosureSolutions, reflexiveClosureSolutions)
    }
}