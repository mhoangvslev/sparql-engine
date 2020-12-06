import PathStageBuilder from "./path-stage-builder";
import { Graph, ExecutionContext, PipelineStage, Pipeline, Bindings, StreamPipelineInput } from "../../api";
import { Algebra } from "sparqljs";

class State {
    private _source: string
    private _node: string

    constructor(source: string, node:string) {
        this._source = source
        this._node = node
    }

    get source(): string {
        return this._source
    }

    get node(): string {
        return this._node
    }
}

abstract class PropertyPathEngine {

    protected readonly MAX_SERVER_DEPTH = 20

    protected evalPathPattern(subject: string, path: Algebra.PropertyPath, obj: string, mod: string, graph: Graph, context: ExecutionContext): PipelineStage<Bindings> {
        let query: Algebra.RootNode = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: [],
            variables: ['*'],
            where: [{
                type: 'bgp',
                triples: [{
                    subject: subject,
                    predicate: {
                        pathType: mod,
                        type: 'path',
                        items: path.items
                    } as Algebra.PropertyPath,
                    object: obj
                }]
            } as Algebra.BGPNode]
        }
        return graph.evalQuery(query, context)
    }

    protected isComplete(bindings: Bindings): boolean {
        return !bindings.some((variable: string, value: string) => {
            if (variable.startsWith('?_depth')) {
                return parseInt(value) === (this.MAX_SERVER_DEPTH - 1)
            }
            return false
        })
    }

    protected mustExplore(state: State, visited: Map<string, Map<string, string>>): boolean {
        if (visited.has(state.source)) {
            return !(visited.get(state.source)!.has(state.node))
        } 
        return true
    }

    protected markAsVisited(state: State, visited: Map<string, Map<string, string>>) {
        if (visited.has(state.source)) {
            visited.get(state.source)!.set(state.node, state.node)
        } else {
            let nodes = new Map<string, string>()
            nodes.set(state.node, state.node)
            visited.set(state.source, nodes)
        }
    }

    protected isSolution(expected: string, actual: string): boolean {
        if (expected.startsWith('?')) {
            return true
        }
        return expected === actual
    }

    public abstract eval(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject>
}

class PipelinePathEngine extends PropertyPathEngine {
    private evalNextBackward(state: State, path: Algebra.PropertyPath, subject: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext): PipelineStage<State> {
        let engine = Pipeline.getInstance()
        return engine.mergeMap(this.evalPathPattern('?node', path, state.node, '+', graph, context), (bindings) => {
            let node: string = bindings.get('?node')!
            let new_state = new State(state.source, node)
            if (this.mustExplore(new_state, visited)) {
                this.markAsVisited(new_state, visited)
                let solution = engine.empty<State>()
                let next_solutions = engine.empty<State>()
                if (this.isSolution(subject, node)) {
                    solution = engine.of<State>(new_state)
                }
                if (!this.isComplete(bindings)) {
                    next_solutions = this.evalNextBackward(new_state, path, subject ,visited, graph, context)
                }
                return engine.merge(solution, next_solutions)
            }
            return engine.empty<State>()
        })
    }

    private evalNextForward(state: State, path: Algebra.PropertyPath, obj: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext): PipelineStage<State> {
        let engine = Pipeline.getInstance()
        return engine.mergeMap(this.evalPathPattern(state.node, path, '?node', '+', graph, context), (bindings) => {
            let node: string = bindings.get('?node')!
            let new_state = new State(state.source, node)
            if (this.mustExplore(new_state, visited)) {
                this.markAsVisited(new_state, visited)
                let solution = engine.empty<State>()
                let next_solutions = engine.empty<State>()
                if (this.isSolution(obj, node)) {
                    solution = engine.of<State>(new_state)
                }
                if (!this.isComplete(bindings)) {
                    next_solutions = this.evalNextForward(new_state, path, obj ,visited, graph, context)
                }
                return engine.merge(solution, next_solutions)
            }
            return engine.empty<State>()
        })
    }

    private evalBackward(subject: string, path: Algebra.PropertyPath, obj: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext): PipelineStage<State> {
        let engine = Pipeline.getInstance()
        return engine.mergeMap(this.evalPathPattern('?node', path, obj, path.pathType, graph, context), (bindings) => {
            let source: string = obj.startsWith('?') ? bindings.get(obj)! : obj
            let node: string = bindings.get('?node')!
            let state = new State(source, node)
            if (this.mustExplore(state, visited)) {
                this.markAsVisited(state, visited)
                let solution = engine.empty<State>()
                let next_solutions = engine.empty<State>()
                if (this.isSolution(subject, node)) {
                    solution = engine.of<State>(state)
                }
                if (!this.isComplete(bindings)) {
                    next_solutions = this.evalNextBackward(state, path, subject, visited, graph, context)
                }
                return engine.merge(solution, next_solutions)
            }
            return engine.empty<State>()
        })
    }

    private evalForward(subject: string, path: Algebra.PropertyPath, obj: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext): PipelineStage<State> {
        let engine = Pipeline.getInstance()
        return engine.mergeMap(this.evalPathPattern(subject, path, '?node', path.pathType, graph, context), (bindings) => {
            let source: string = subject.startsWith('?') ? bindings.get(subject)! : subject
            let node: string = bindings.get('?node')!
            let state = new State(source, node)
            if (this.mustExplore(state, visited)) {
                this.markAsVisited(state, visited)
                let solution = engine.empty<State>()
                let next_solutions = engine.empty<State>()
                if (this.isSolution(obj, node)) {
                    solution = engine.of<State>(state)
                }
                if (!this.isComplete(bindings)) {
                    next_solutions = this.evalNextForward(state, path, obj, visited, graph, context)
                }
                return engine.merge(solution, next_solutions)
            }
            return engine.empty<State>()
        })
    }

    public eval(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        let engine = Pipeline.getInstance()
        let visited = new Map<string, Map<string, string>>()
        let forward = true
        let solutions = engine.empty<State>()
        if (subject.startsWith('?') && !obj.startsWith('?')) {
            forward = false
            solutions = this.evalBackward(subject, path, obj, visited, graph, context)
        } else {
            forward = true
            solutions = this.evalForward(subject, path, obj, visited, graph, context)
        }
        return engine.map(solutions, (state) => {
            return {
                subject: forward ? state.source : state.node,
                predicate: "",
                object: forward ? state.node : state.source
            }
        })
    }
}

class AsyncPathEngine extends PropertyPathEngine {
    private indexOfFrontierState(state: State, frontier: Array<State>): number {
        for (let i = 0; i < frontier.length; i++) {
            if (frontier[i].source === state.source && frontier[i].node === state.node) {
                return i 
            }
        }
        return -1
    }

    private evalNextBackward(input: StreamPipelineInput<State>, state: State, path: Algebra.PropertyPath, subject: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext): Promise<Array<State>> {
        let frontier = new Array<State>()
        return new Promise<Array<State>>((resolve, reject) => {
            this.evalPathPattern('?node', path, state.node, '+', graph, context).subscribe((bindings) => {
                let node: string = bindings.get('?node')!
                let new_state = new State(state.source, node)
                if (this.mustExplore(new_state, visited)) {
                    this.markAsVisited(new_state, visited)
                    if (this.isSolution(subject, node)) {
                        input.next(new_state)
                    }
                    if (!this.isComplete(bindings)) {
                        frontier.push(new_state)
                    }
                } else if (this.isComplete(bindings)) {
                    let index = this.indexOfFrontierState(new_state, frontier)
                    if (index >= 0) {
                        frontier.splice(index, 1)
                    }
                }
            }, (reason) => {
                reject(reason)
            }, () => {
                resolve(frontier)
            })
        })
    }

    private async evalNextBackwardFromFrontier(input: StreamPipelineInput<State>, frontier: Array<State>, path: Algebra.PropertyPath, subject: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext) {
        let newFrontier = new Array<State>()
        for (let state of frontier) {
            let partialFrontier = await this.evalNextBackward(input, state, path, subject, visited, graph, context)
            newFrontier.push(...partialFrontier)
        }
        if (newFrontier.length > 0) {
            this.evalNextBackwardFromFrontier(input, newFrontier, path, subject, visited, graph, context)
        } else {
            input.complete()
        }
    }

    private evalBackward(input: StreamPipelineInput<State>, subject: string, path: Algebra.PropertyPath, obj: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext): Promise<Array<State>> {
        let frontier = new Array<State>()
        return new Promise<Array<State>>((resolve, reject) => {
            this.evalPathPattern('?node', path, obj, path.pathType, graph, context).subscribe((bindings) => {
                let source: string = obj.startsWith('?') ? bindings.get(obj)! : obj
                let node: string = bindings.get('?node')!
                let state = new State(source, node)
                if (this.mustExplore(state, visited)) {
                    this.markAsVisited(state, visited)
                    if (this.isSolution(subject, node)) {
                        input.next(state)
                    }
                    if (!this.isComplete(bindings)) {
                        frontier.push(state)
                    }
                } else if (this.isComplete(bindings)) {
                    let index = this.indexOfFrontierState(state, frontier)
                    if (index >= 0) {
                        frontier.splice(index, 1)
                    }
                }
            }, (reason) => {
                reject(reason)
            }, () => {
                resolve(frontier)
            })
        })
    }

    private async initEvalBackward(input: StreamPipelineInput<State>, subject: string, path: Algebra.PropertyPath, obj: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext) {
        let frontier = await this.evalBackward(input, subject, path, obj, visited, graph, context)
        if (frontier.length > 0) {
            this.evalNextBackwardFromFrontier(input, frontier, path, subject, visited, graph, context)
        } else {
            input.complete()
        }
    }

    private evalNextForward(input: StreamPipelineInput<State>, state: State, path: Algebra.PropertyPath, obj: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext): Promise<Array<State>> {
        let frontier = new Array<State>()
        return new Promise<Array<State>>((resolve, reject) => {
            this.evalPathPattern(state.node, path, '?node', '+', graph, context).subscribe((bindings) => {
                let node: string = bindings.get('?node')!
                let new_state = new State(state.source, node)
                if (this.mustExplore(new_state, visited)) {
                    this.markAsVisited(new_state, visited)
                    if (this.isSolution(obj, node)) {
                        input.next(new_state)
                    }
                    if (!this.isComplete(bindings)) {
                        frontier.push(new_state)
                    }
                } else if (this.isComplete(bindings)) {
                    let index = this.indexOfFrontierState(new_state, frontier)
                    if (index >= 0) {
                        console.log('removing frontier node')
                        frontier.splice(index, 1)
                    }
                }
            }, (reason) => {
                reject(reason)
            }, () => {
                resolve(frontier)
            })
        })
    }

    private async evalNextForwardFromFrontier(input: StreamPipelineInput<State>, frontier: Array<State>, path: Algebra.PropertyPath, obj: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext) {
        let newFrontier = new Array<State>()
        for (let state of frontier) {
            let partialFrontier = await this.evalNextForward(input, state, path, obj, visited, graph, context)
            newFrontier.push(...partialFrontier)
        }
        if (newFrontier.length > 0) {
            this.evalNextForwardFromFrontier(input, newFrontier, path, obj, visited, graph, context)
        } else {
            input.complete()
        }
    }

    private evalForward(input: StreamPipelineInput<State>, subject: string, path: Algebra.PropertyPath, obj: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext): Promise<Array<State>> {
        let frontier = new Array<State>()
        return new Promise<Array<State>>((resolve, reject) => {
            this.evalPathPattern(subject, path, '?node', path.pathType, graph, context).subscribe((bindings) => {
                let source: string = subject.startsWith('?') ? bindings.get(subject)! : subject
                let node: string = bindings.get('?node')!
                let state = new State(source, node)
                if (this.mustExplore(state, visited)) {
                    this.markAsVisited(state, visited)
                    if (this.isSolution(obj, node)) {
                        input.next(state)
                    }
                    if (!this.isComplete(bindings)) {
                        console.log('not complete')
                        frontier.push(state)
                    }
                } else if (this.isComplete(bindings)) {
                    let index = this.indexOfFrontierState(state, frontier)
                    if (index >= 0) {
                        console.log('removing frontier node')
                        frontier.splice(index, 1)
                    }
                }
            }, (reason) => {
                reject(reason)
            }, () => {
                resolve(frontier)
            })
        })
    }

    private async initEvalForward(input: StreamPipelineInput<State>, subject: string, path: Algebra.PropertyPath, obj: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext) {
        let frontier = await this.evalForward(input, subject, path, obj, visited, graph, context)
        if (frontier.length > 0) {
            this.evalNextForwardFromFrontier(input, frontier, path, obj, visited, graph, context)
        } else {
            input.complete()
        }
    }

    public eval(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        let engine = Pipeline.getInstance()
        let visited = new Map<string, Map<string, string>>()
        let forward = true
        let solutions = engine.fromAsync((input: StreamPipelineInput<State>) => {
            if (subject.startsWith('?') && !obj.startsWith('?')) {
                forward = false
                this.initEvalBackward(input, subject, path, obj, visited, graph, context)
            } else {
                forward = true
                this.initEvalForward(input, subject, path, obj, visited, graph, context)
            }
        })
        return engine.map(solutions, (state) => {
            return {
                subject: forward ? state.source : state.node,
                predicate: "",
                object: forward ? state.node : state.source
            }
        })
    }
}

/**
 * @author Julien Aimonier-Davat
 */
export default class AlphaStageBuilder extends PathStageBuilder {
    
    _executePropertyPath(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        return new AsyncPathEngine().eval(subject, path, obj, graph, context)
    }

}