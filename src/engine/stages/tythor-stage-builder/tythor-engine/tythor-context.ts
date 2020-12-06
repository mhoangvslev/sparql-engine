import { rdf } from "../../../../api"
import { TythorState } from "./tythor-state"


/**
 * @author Julien Aimonier-Davat
 */
export class TythorContext {

    private _subject: string
    private _object: string
    private _visited: Map<string, Map<string, string>>
    private _stop: boolean
    private _closure: boolean
    
    constructor(subject: string, object: string, closure: boolean = false) {
        this._subject = subject
        this._object = object
        this._visited = new Map<string, Map<string, string>>()
        this._stop = false
        this._closure = closure
    }

    get subject(): string {
        return this._subject
    }

    get object(): string {
        return this._object
    }

    get stop(): boolean {
        return this._stop
    }

    set stop(value: boolean) {
        this._stop = value
    }

    public visited(state: TythorState): boolean {
        if (this._visited.has(state.subject)) {
            return this._visited.get(state.subject)!.has(state.object)
        }
        return false
    }

    public mark_as_visited(state: TythorState): void {
        if (this._closure) {
            if (this._visited.has(state.subject)) {
                this._visited.get(state.subject)!.set(state.object, state.object)
            } else {
                let visitedNodes = new Map<string, string>()
                visitedNodes.set(state.object, state.object)
                this._visited.set(state.subject, visitedNodes)
            }
        }
    }

    public isSolution(state: TythorState): boolean {
        if (rdf.isVariable(this.subject) && rdf.isVariable(this.object)) {
            if (this.subject === this.object) {
                return state.subject === state.object
            } else {
                return true
            }
        }
        if (rdf.isVariable(this.object)) {
            return true
        } else if (this.object === state.object) {
            this.stop = true
            return true
        } else {
            return false
        }
    }
}