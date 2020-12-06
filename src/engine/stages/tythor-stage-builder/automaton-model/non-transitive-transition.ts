import { State } from "./state"
import { Algebra } from "sparqljs"
import { Graph, ExecutionContext, PipelineStage, Bindings } from "../../../../api"
import { Transition } from "./transition"


/**
 * @author Julien Aimonier-Davat
 */
export abstract class NonTransitiveTransition extends Transition {

    constructor(from: State, to: State) {
        super(from, to)
    }

    protected buildFilter (variable: string, predicates: Array<string>): Algebra.FilterNode {
        let node: Algebra.FilterNode = {
            type: 'filter',
            expression: {
                type: 'operation',
                operator: '!=',
                args: [variable, predicates[0]]
            }
        }
        for (let i = 1; i < predicates.length; i++) {
            let expression: Algebra.SPARQLExpression = {
                type: 'operation',
                operator: '&&',
                args: [node.expression, {
                    type: 'operation',
                    operator: '!=',
                    args: [variable, predicates[i]]
                }]
            }
            node.expression = expression
        }
        return node
    }
}