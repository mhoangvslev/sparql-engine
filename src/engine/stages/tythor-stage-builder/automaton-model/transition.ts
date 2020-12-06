import { State } from "./state"
import { Graph, ExecutionContext, PipelineStage, Bindings } from "../../../../api"


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

    public abstract eval(subject: string, object: string, graph: Graph, context: ExecutionContext): PipelineStage<Bindings>

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