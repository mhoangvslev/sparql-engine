import { State } from "./state"
import { Algebra } from "sparqljs"


/**
 * @author Julien Aimonier-Davat
 */
export abstract class Transition {
    private _from: State
    private _to: State

    constructor(from: State, to: State) {
        this._from = from
        this._to = to
    }

    get from(): State {
        return this._from
    }

    set from(state: State) {
        this._from = state
    }

    get to(): State {
        return this._to
    }

    set to(state: State) {
        this._to = state
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

    public abstract buildQuery(subject: string, object: string, joinPrefix?: string, filterPrefix?: string): Algebra.RootNode

    public print(marginLeft: number): void {
        console.log(`${" ".repeat(marginLeft)}> Transition{
            from: ${this.from.name}, 
            to: ${this.to.name},
        }`)
    }

    public equals(other: Transition): boolean {
        return this.from.equals(other.from) && this.to.equals(other.to)
    }
}