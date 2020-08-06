import { Automaton } from '../automaton-model/automaton';
import { SequenceTransition } from '../automaton-model/sequence-transition';
import { AlternativeTransition } from '../automaton-model/alternative-transition';
/**
 * @author Julien Aimonier-Davat
 */
export declare class PathsMergingOptimizer {
    optimize(automaton: Automaton<SequenceTransition>): Automaton<AlternativeTransition>;
}
