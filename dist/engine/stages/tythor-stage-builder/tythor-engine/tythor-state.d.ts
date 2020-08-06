import { State } from "../automaton-model/state";
/**
 * @author Julien Aimonier-Davat
 */
export declare class TythorState {
    private _subject;
    private _object;
    private _state;
    constructor(subject: string, object: string, state: State);
    get subject(): string;
    set subject(subject: string);
    get object(): string;
    get state(): State;
    set state(state: State);
    copy(): TythorState;
    toString(): string;
}
