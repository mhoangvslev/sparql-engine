import PlanVisitor from "../plan-visitor";
import { Algebra } from "sparqljs";
/**
 * Implements a static join ordering algorithm based on counting-variable algorithm
 * @author Julien AIMONIER-DAVAT
 */
export default class ReorderBasicGraphPatternTriples extends PlanVisitor {
    private getWeight;
    private selectMinWeightedTriple;
    private selectMinWeightedJoinTriple;
    private updateBoundVariable;
    private reorder;
    /**
     * Visit and transform a Basic Graph Pattern node.
     * Use static join ordering algorithm to reorder BGP triple patterns
     * @param  node - Basic Graph Pattern node
     * @return The transformed Basic Graph Pattern node
     */
    visitBGP(node: Algebra.BGPNode): Algebra.PlanNode;
}
