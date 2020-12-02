import { State } from "../automaton-model/state"


/**
 * @author Julien Aimonier-Davat
 */
export class TythorState {    
    private _subject: string
    private _object: string
    private _state: State
    private _depth: number

    constructor(subject: string, object: string, state: State, depth: number) {
        this._subject = subject
        this._object = object
        this._state = state
        this._depth = depth
    }

    get subject(): string {
        return this._subject
    }

    set subject(subject: string) {
        this._subject = subject
    }

    get object(): string {
        return this._object
    }

    get state(): State {
        return this._state
    }

    set state(state: State) {
        this._state = state
    }

    get depth(): number {
        return this._depth
    }

    set depth(value: number) {
        this._depth = value
    }

    public copy(): TythorState {
        return new TythorState(this.subject, this.object, this.state, this.depth)
    }

    public toString(): string {
        return `{subject: ${this._subject}, object: ${this._object}, state: ${this._state.name}, depth: ${this._depth}}`
    }
}