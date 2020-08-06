import { Pipeline, ExecutionContext, Graph, PipelineStage, Bindings, PipelineEngine, StreamPipelineInput } from "../../../../api"
import { Algebra } from "sparqljs"
import { Transition } from "../automaton-model/transition"
import { Automaton } from "../automaton-model/automaton"
import { TyThorEngine } from "./tythor-engine"
import { TythorContext } from "./tythor-context"
import { TythorState } from "./tythor-state"


/**
 * @author Julien Aimonier-Davat
 * Evaluates transitive closures using the dynamic iterative deepening rewriting approach
 */
export class OptimizedTyThorEngine extends TyThorEngine {

    private evalQuery(query: Algebra.RootNode, graph: Graph, context: ExecutionContext): Promise<Array<string>> {
        let solutions = new Array<string>()
        return new Promise((resolve, reject) => {
            graph.evalQuery(query, context).subscribe((solution: Bindings) => {
                solutions.push(solution.get('?tythorObject')!)
            }, (err: any) => {
                reject(err)
            }, () => {
                resolve(solutions)
            })
        })
    }

    private async evalStarTransition(searchState: TythorState, input: StreamPipelineInput<TythorState>, transition: Transition, graph: Graph, ppContext: TythorContext, context: ExecutionContext): Promise<void> {
        let queue = new Array<TythorState>()
        queue.push(searchState)

        while (queue.length > 0) {
            let currentSearchState = queue.shift()!
            let depth = 0
            let nbSolution = 0
            let nbDuplicate = 0
            let solutions = new Array<TythorState>()
            do {
                depth++
                nbSolution = 0
                nbDuplicate = 0
                solutions = new Array<TythorState>()
                let query = transition.buildStarQuery(currentSearchState.object, '?tythorObject', depth)
                let queryResults = await this.evalQuery(query, graph, context)
                for (let solution of queryResults) {
                    if (ppContext.visited(currentSearchState.subject, solution)) {
                        nbDuplicate++
                    } else {
                        ppContext.visit(currentSearchState.subject, solution)
                        let newSearchState = new TythorState(currentSearchState.subject, solution, transition.to)
                        if (ppContext.isSolution(currentSearchState.subject, solution)) {
                            input.next(newSearchState)
                            if (ppContext.stop) {
                                input.complete()
                                return
                            }
                        }
                        solutions.push(newSearchState)
                        nbSolution++
                    }
                }
            } while (nbSolution > 0 && ((nbDuplicate / (nbSolution + nbDuplicate)) * 100) <= 0 && transition.supportStarQuery())
            
            if (nbSolution > 0) {
                queue.push(...solutions)
            }
        }
        input.complete()
    }

    protected computeNextStep(searchState: TythorState, automaton: Automaton<Transition>, graph: Graph, ppContext: TythorContext, context: ExecutionContext): PipelineStage<TythorState> {
        let engine: PipelineEngine = Pipeline.getInstance()

        if (ppContext.stop) {
            return engine.empty<TythorState>()
        }

        let newSolution = engine.empty<TythorState>()
        if (searchState.state.isFinal) {
            if (!ppContext.visited(searchState.subject, searchState.object) && ppContext.isSolution(searchState.subject, searchState.object)) {
                newSolution = engine.of(searchState)
            }

            if (ppContext.visited(searchState.subject, searchState.object)) {
                return engine.empty<TythorState>()
            } else {
                ppContext.visit(searchState.subject, searchState.object)
            }
        }

        let nextSolutions = engine.mergeMap(engine.from(automaton.findTransitionsFrom(searchState.state)), (transition: Transition) => {
            if (transition.from.equals(transition.to)) {
                let source: PipelineStage<TythorState> = engine.fromAsync(input => {
                    this.evalStarTransition(searchState, input, transition, graph, ppContext, context)
                })
                return engine.mergeMap(source, (result: TythorState) => {
                    return engine.merge(engine.of(result), this.computeNextStep(result, automaton, graph, ppContext, context))
                })
            } else {
                return engine.mergeMap(this.evalTransition(searchState, transition, graph, context), (result: TythorState) => {
                    return this.computeNextStep(result, automaton, graph, ppContext, context)
                })
            }
        })

        return engine.merge(newSolution, nextSolutions)
    }
}