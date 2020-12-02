import { State } from "./state"
import { Instruction } from "./instruction"
import { Transition } from "./transition"
import { Algebra } from "sparqljs"
import { rdf } from "../../../../api"
import { Automaton } from "./automaton"


/**
 * @author Julien Aimonier-Davat
 */
export class ClosureTransition<T extends Transition> extends Transition {
   
    private _automaton: Automaton<T>

    constructor(from: State, to: State, automaton: Automaton<T>) {
        super(from, to)
        this._automaton = automaton
    }

    get automaton(): Automaton<T> {
        return this._automaton
    }

    set automaton(automaton: Automaton<T>) {
        this._automaton = automaton
    }

    public buildQuery(subject: string, object: string, joinPrefix?: string, filterPrefix?: string): Algebra.RootNode {
        throw new Error("Method not implemented.")
    }

    public print(marginLeft: number): void {
        console.log(`${" ".repeat(marginLeft)}> Transition{
            from: ${this.from.name}, 
            to: ${this.to.name},
            automaton:\n`)
        this.automaton.print(marginLeft + 2)
        console.log(`${" ".repeat(marginLeft)}\n}`)
    }

    public equals(other: ClosureTransition<T>): boolean {
        return super.equals(other) && this.automaton.equals(other.automaton)
    }
}