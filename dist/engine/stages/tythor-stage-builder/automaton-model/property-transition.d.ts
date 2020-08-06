import { State } from "./state";
import { Instruction } from "./instruction";
import { Transition } from "./transition";
import { Algebra } from "sparqljs";
/**
 * @author Julien Aimonier-Davat
 */
export declare class PropertyTransition extends Transition {
    private _instruction;
    constructor(from: State, to: State, instruction: Instruction);
    get instruction(): Instruction;
    private instructions2sparql;
    buildQuery(subject: string, object: string, joinPrefix?: string, filterPrefix?: string): Algebra.RootNode;
    print(marginLeft: number): void;
    equals(other: PropertyTransition): boolean;
}
