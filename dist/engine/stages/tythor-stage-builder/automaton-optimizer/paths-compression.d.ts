import { Automaton } from '../automaton-model/automaton';
import { SequenceTransition } from '../automaton-model/sequence-transition';
import { PropertyTransition } from '../automaton-model/property-transition';
/**
 * @author Julien Aimonier-Davat
 */
export declare class PathsCompressionOptimizer {
    private hasSelfTransition;
    private buildPathsFrom;
    private buildPaths;
    optimize(automaton: Automaton<PropertyTransition>): Automaton<SequenceTransition>;
}
