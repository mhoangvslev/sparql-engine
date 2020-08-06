import { Pipeline, rdf, ExecutionContext, Graph, PipelineStage, Bindings, PipelineEngine } from "../../../../api"
import { Transition } from "../automaton-model/transition"
import { Automaton } from "../automaton-model/automaton"
import { TythorContext } from "./tythor-context"
import { TythorState } from "./tythor-state"
import { TyThorEngine } from "./tythor-engine"


/**
 * @author Julien Aimonier-Davat
 * Warning: Must not be used to evaluate a transitive closure expression !
 * Without remembering the visited nodes, the evaluation may not terminate ! 
 */
export class TyThorEngineWithoutNodeRemembering extends TyThorEngine {

    protected computeNextStep(searchState: TythorState, automaton: Automaton<Transition>, graph: Graph, ppContext: TythorContext, context: ExecutionContext): PipelineStage<TythorState> {
        let engine: PipelineEngine = Pipeline.getInstance()

        if (ppContext.stop) {
            return engine.empty<TythorState>()
        }

        let newSolution = engine.empty<TythorState>()
        if (searchState.state.isFinal && ppContext.isSolution(searchState.subject, searchState.object)) {
            newSolution = engine.of(searchState)
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
                return this.computeNextStep(searchState, automaton, graph, ppContext, context)
            })
        })
    }
}