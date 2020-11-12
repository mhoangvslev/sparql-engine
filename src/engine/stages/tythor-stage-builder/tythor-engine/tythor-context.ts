import { rdf } from "../../../../api"


/**
 * @author Julien Aimonier-Davat
 */
export class TythorContext {

    private _subject: string
    private _object: string
    private _visited: Map<string, Map<string, string>>
    private _stop: boolean
    private _closure: boolean
    private _solution: number
    
    constructor(subject: string, object: string, closure: boolean = false) {
        this._subject = subject
        this._object = object
        this._visited = new Map<string, Map<string, string>>()
        this._stop = false
        this._closure = closure
        this._solution = 0
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

    public visited(subject: string, node: string): boolean {
        if (this._visited.has(subject)) {
            return this._visited.get(subject)!.has(node)
        }
        return false
    }

    public visit(subject:string, node: string) {
        if (this._closure) {
            if (this._visited.has(subject)) {
                this._visited.get(subject)!.set(node, node)
            } else {
                let visitedNodes = new Map<string, string>()
                visitedNodes.set(node, node)
                this._visited.set(subject, visitedNodes)
            }
        }
    }

    public isSolution(subject: string, object: string): boolean {
        if (rdf.isVariable(this.subject) && rdf.isVariable(this.object)) {
            if (this.subject === this.object) {
                return subject === object
            } else {
                return true
            }
        }
        if (rdf.isVariable(this.object)) {
            return true
        } else if (this.object === object) {
            this.stop = true
            return true
        } else {
            return false
        }
    }
}