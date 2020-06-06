import { State } from "./automaton-state"
import { Instruction } from "./transition-instruction"

export class Transition {
    private _from: State
    private _to: State
    private _instructions: Array<Instruction>

    constructor(from: State, to: State, properties: string[], inverse: boolean, negation: boolean) {
        this._from = from
        this._to = to
        this._instructions = new Array<Instruction>()
        this._instructions.push(new Instruction(properties, inverse, negation))
    }

    get from(): State {
        return this._from
    }

    get to(): State {
        return this._to
    }

    get instructions(): Instruction[] {
        return this._instructions
    }

    public merge(transition: Transition): void {
        if (!this.to.equals(transition.from)) {
            throw new Error(`A transition to node ${this.to} cannot be merged with a transition from node ${transition.from}`)
        }
        this._to = transition.to
        this._instructions.push(...transition.instructions)
    }

    public print(marginLeft: number): void {
        console.log(`${" ".repeat(marginLeft)}> Transition{
            from: ${this.from.name}, 
            to: ${this.to.name},
            instructions: ${JSON.stringify(this._instructions)}
        }`)
    }

    public equals(other: Transition): boolean {
        if (!this.from.equals(other.from) || !this.to.equals(other.to)) {
            return false
        }
        for (let i = 0; i < this.instructions.length; i++) {
            if (!this.instructions[i].equals(other.instructions[i])) {
                return false
            }
        }
        return true
    }
}