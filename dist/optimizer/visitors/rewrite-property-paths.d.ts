import PlanVisitor from '../plan-visitor';
import { Algebra } from 'sparqljs';
/**
 * Implements a simple Property Path rewriting: non-transitive expression are extracted and injected in the BGP
 * @author Julien AIMONIER-DAVAT
 */
export default class RewritePropertyPaths extends PlanVisitor {
    private _numVariable;
    constructor();
    /**
     * Visit and transform a Basic Graph Pattern node.
     * Non-transitive expressions of Property Path patterns are rewritten.
     * @param  node - Basic Graph Pattern node
     * @return The transformed Basic Graph Pattern node
     */
    visitBGP(node: Algebra.BGPNode): Algebra.PlanNode;
    private isPathTriple;
    private extractNegatedPredicates;
    private buildFilter;
    private rewriteInverseExpression;
    private rewriteSequenceExpression;
    private rewriteAlternativeExpression;
}
