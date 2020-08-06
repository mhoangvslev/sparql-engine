import { ExecutionContext, Graph, PipelineStage } from "../../../../api";
import { Transition } from "../automaton-model/transition";
import { Automaton } from "../automaton-model/automaton";
import { TythorContext } from "./tythor-context";
import { TythorState } from "./tythor-state";
import { TyThorEngine } from "./tythor-engine";
/**
 * @author Julien Aimonier-Davat
 * Warning: Must not be used to evaluate a transitive closure expression !
 * Without remembering the visited nodes, the evaluation may not terminate !
 */
export declare class TyThorEngineWithoutNodeRemembering extends TyThorEngine {
    protected computeNextStep(searchState: TythorState, automaton: Automaton<Transition>, graph: Graph, ppContext: TythorContext, context: ExecutionContext): PipelineStage<TythorState>;
    protected computeFirstStep(automaton: Automaton<Transition>, graph: Graph, ppContext: TythorContext, context: ExecutionContext): PipelineStage<TythorState>;
}
