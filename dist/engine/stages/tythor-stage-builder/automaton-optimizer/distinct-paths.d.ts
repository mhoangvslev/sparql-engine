import { Automaton } from '../automaton-model/automaton';
import { SequenceTransition } from '../automaton-model/sequence-transition';
/**
 * @author Julien Aimonier-Davat
 */
export declare class DistinctPathsOptimizer {
    optimize(automaton: Automaton<SequenceTransition>): Automaton<SequenceTransition>;
}
