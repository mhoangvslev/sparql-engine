import PathStageBuilder from "./path-stage-builder";
import { Graph, ExecutionContext, PipelineStage, Pipeline, Bindings, rdf } from "../../api";
import { Algebra } from "sparqljs";
import { Generator } from "sparqljs";
import { StreamPipelineInput } from "../pipeline/pipeline-engine";

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


/**
 * @author Julien Aimonier-Davat
 */
export default class AlphaStageBuilder extends PathStageBuilder {
    
    private evalDLS(subject: string, path: Algebra.PropertyPath, obj: string, mod: string, graph: Graph, context: ExecutionContext): PipelineStage<Bindings> {
        let query: Algebra.RootNode = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: [],
            variables: ['?node'],
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

    private isComplete(bindings: Bindings): boolean {
        return !bindings.some((variable: string, value: string) => {
            if (variable.startsWith('?_depth')) {
                return parseInt(value) === 4
            }
            return false
        })
    }

    private mustExplore(state: State, visited: Map<string, Map<string, string>>): boolean {
        if (visited.has(state.source)) {
            return !(visited.get(state.source)!.has(state.node))
        } 
        return true
    }

    private markAsVisited(state: State, visited: Map<string, Map<string, string>>) {
        if (visited.has(state.source)) {
            visited.get(state.source)!.set(state.node, state.node)
        } else {
            let nodes = new Map<string, string>()
            nodes.set(state.node, state.node)
            visited.set(state.source, nodes)
        }
    }

    private isSolution(expected: string, actual: string): boolean {
        if (expected.startsWith('?')) {
            return true
        }
        return expected === actual
    }

    private evalNextBackward(state: State, path: Algebra.PropertyPath, subject: string, visited: Map<string, Map<string, string>>, graph: Graph, context: ExecutionContext): PipelineStage<State> {
        let engine = Pipeline.getInstance()
        return engine.mergeMap(this.evalDLS('?node', path, state.node, '+', graph, context), (bindings) => {
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
        return engine.mergeMap(this.evalDLS(state.node, path, '?node', '+', graph, context), (bindings) => {
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
        return engine.mergeMap(this.evalDLS('?node', path, obj, path.pathType, graph, context), (bindings) => {
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
        return engine.mergeMap(this.evalDLS(subject, path, '?node', path.pathType, graph, context), (bindings) => {
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
    
    _executePropertyPath(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
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