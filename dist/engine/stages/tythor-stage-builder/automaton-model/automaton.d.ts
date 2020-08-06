import { State } from "./state";
import { Transition } from "./transition";
/**
 * @author Julien Aimonier-Davat
 */
export declare class Automaton<T extends Transition> {
    private _states;
    private _transitions;
    constructor();
    get states(): Array<State>;
    get transitions(): Array<T>;
    addState(state: State): void;
    findState(name: number): State | undefined;
    findInitialStates(): State[];
    findTransitionsFrom(from: State): T[];
    findTransition(from: State, to: State): T | undefined;
    addTransition(transition: T): void;
    print(marginLeft?: number): void;
    equals(other: Automaton<T>): boolean;
}
