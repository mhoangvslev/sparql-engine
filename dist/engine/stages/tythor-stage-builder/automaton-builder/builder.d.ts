import { BuilderAlgebra } from 'sparqljs';
import { Automaton } from '../automaton-model/automaton';
import { PropertyTransition } from '../automaton-model/property-transition';
/**
 * @author Julien Aimonier-Davat
 */
export declare class AutomatonBuilder {
    private rewriteNegations;
    private addNodeIdentifier;
    private initializeTree;
    private rewriteNegation;
    private pushDownInverses;
    private inverseSequences;
    private pushDownInverse;
    private printTree;
    build(propertyPath: BuilderAlgebra.PropertyPath, forward: boolean): Automaton<PropertyTransition>;
}
