import { State } from "./state";
import { Instruction } from "./instruction";
import { Transition } from "./transition";
import { Algebra } from "sparqljs";
/**
 * @author Julien Aimonier-Davat
 */
export declare class AlternativeTransition extends Transition {
    private _instructions;
    constructor(from: State, to: State);
    get instructions(): Instruction[][];
    buildQuery(subject: string, object: string, joinPrefix?: string, filterPrefix?: string): Algebra.RootNode;
    print(marginLeft: number): void;
    equals(other: AlternativeTransition): boolean;
}
