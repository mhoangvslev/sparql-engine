import { State } from "./state";
import { Algebra } from "sparqljs";
/**
 * @author Julien Aimonier-Davat
 */
export declare abstract class Transition {
    private _from;
    private _to;
    constructor(from: State, to: State);
    get from(): State;
    get to(): State;
    set to(state: State);
    protected buildFilter(variable: string, predicates: Array<string>): Algebra.FilterNode;
    abstract buildQuery(subject: string, object: string, joinPrefix?: string, filterPrefix?: string): Algebra.RootNode;
    print(marginLeft: number): void;
    equals(other: Transition): boolean;
}
