import { ExecutionContext, Graph, PipelineStage } from "../../../../api";
import { Algebra } from "sparqljs";
import { Transition } from "../automaton-model/transition";
import { Automaton } from "../automaton-model/automaton";
import { TythorContext } from "./tythor-context";
import { TythorState } from "./tythor-state";
/**
 * @author Julien Aimonier-Davat
 * Evaluates path expressions using a set semantics. This engine must be used
 * to compute transitive closure expressions. Non-transitive expressions must
 * have been rewritten during the optimization of the query plan.
 */
export declare class TyThorEngine {
    protected evalTransition(searchState: TythorState, transition: Transition, graph: Graph, context: ExecutionContext): PipelineStage<TythorState>;
    protected computeNextStep(searchState: TythorState, automaton: Automaton<Transition>, graph: Graph, ppContext: TythorContext, context: ExecutionContext): PipelineStage<TythorState>;
    protected computeFirstStep(automaton: Automaton<Transition>, graph: Graph, ppContext: TythorContext, context: ExecutionContext): PipelineStage<TythorState>;
    protected reflexiveClosure(subject: string, object: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject>;
    evalPropertyPaths(subject: string, automaton: Automaton<Transition>, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject>;
}
