import { Automaton } from '../automaton-model/automaton';
import { SequenceTransition } from '../automaton-model/sequence-transition';
/**
 * @author Julien Aimonier-Davat
 */
export declare class StatesMergingOptimizer {
    private compareInstructions;
    private compareTransitions;
    private compareStates;
    private computeEquivalencies;
    optimize(automaton: Automaton<SequenceTransition>): Automaton<SequenceTransition>;
}
