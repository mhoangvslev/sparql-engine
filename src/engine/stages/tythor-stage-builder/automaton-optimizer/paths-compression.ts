import { Automaton } from '../automaton-model/automaton'
import { State } from '../automaton-model/state'
import { SequenceTransition } from '../automaton-model/sequence-transition'
import { cloneDeep } from 'lodash'
import { PropertyTransition } from '../automaton-model/property-transition'
import { isClosureTransition } from '../utils'
import { ClosureTransition } from '../automaton-model/closure-transition'

/**
 * @author Julien Aimonier-Davat
 */
export class PathsCompressionOptimizer {

    
    private isIntermediateState(automaton: Automaton<PropertyTransition>, state: State): boolean {
        for (let transition of automaton.findTransitionsFrom(state)) {
            if (transition.from.name >= transition.to.name) {
                return false
            }
        }
        return !state.isFinal
    }

    private buildPathsFrom(automaton: Automaton<PropertyTransition>, state: State): Array<Array<SequenceTransition | ClosureTransition<SequenceTransition>>> {
        let paths = new Array<Array<SequenceTransition | ClosureTransition<SequenceTransition>>>()
        let stack = new Array<Array<SequenceTransition | ClosureTransition<SequenceTransition>>>()
        
        for (let transition of automaton.findTransitionsFrom(state)) {
            if (isClosureTransition(transition)) {
                let nestedAutomaton = this.optimize(transition.automaton)
                let closureTransition = new ClosureTransition<SequenceTransition>(transition.from, transition.to, nestedAutomaton)
                stack.push([closureTransition])
            } else {
                let sequenceTransition = new SequenceTransition(transition.from, transition.to)
                sequenceTransition.instructions.push(transition.instruction)
                stack.push([sequenceTransition])
            }
        }

        while (stack.length > 0) {
            let path = stack.pop()!
            let last = path[path.length - 1]
            if (!this.isIntermediateState(automaton, last.to)) {
                paths.push(path)
            } else {
                for (let transition of automaton.findTransitionsFrom(last.to)) {
                    let branch = cloneDeep(path)
                    let branchLast = branch[branch.length - 1]
                    if (isClosureTransition(branchLast)) {
                        if (isClosureTransition(transition)) {
                            let nestedAutomaton = this.optimize(transition.automaton)
                            let closureTransition = new ClosureTransition<SequenceTransition>(transition.from, transition.to, nestedAutomaton)
                            branch.push(closureTransition)
                            stack.push(branch)
                        } else {
                            let sequenceTransition = new SequenceTransition(transition.from, transition.to)
                            sequenceTransition.instructions.push(transition.instruction)
                            branch.push(sequenceTransition)
                            stack.push(branch)
                        }
                    } else {
                        if (isClosureTransition(transition)) {
                            let nestedAutomaton = this.optimize(transition.automaton)
                            let closureTransition = new ClosureTransition<SequenceTransition>(transition.from, transition.to, nestedAutomaton)
                            branch.push(closureTransition)
                            stack.push(branch)
                        } else {
                            let sequenceTransition = new SequenceTransition(transition.from, transition.to)
                            sequenceTransition.instructions.push(transition.instruction)
                            branchLast.merge(sequenceTransition)
                            stack.push(branch)
                        }
                    }
                }

                
            }
        }

        return paths
    }

    private buildPaths(automaton: Automaton<PropertyTransition>): Array<Array<SequenceTransition | ClosureTransition<SequenceTransition>>> {
        let paths = new Array<Array<SequenceTransition | ClosureTransition<SequenceTransition>>>()

        let visited = new Set<number>()
        let stack = new Array<State>()

        let initialState: State = automaton.findInitialStates()[0]
        stack.push(initialState)
        visited.add(initialState.name)

        while (stack.length > 0) {
            let currentState = stack.pop()!
            let pathsFromCurrentState: Array<Array<SequenceTransition | ClosureTransition<SequenceTransition>>> = this.buildPathsFrom(automaton, currentState)
            
            paths.push(...pathsFromCurrentState)

            for (let path of pathsFromCurrentState) {
                let last = path[path.length - 1]
                if (!visited.has(last.to.name)) {
                    stack.push(last.to)
                    visited.add(last.to.name)
                }
            }
        }

        return paths
    }

    public optimize(automaton: Automaton<PropertyTransition>): Automaton<SequenceTransition> {
        let paths = this.buildPaths(cloneDeep(automaton))
        let optimizedAutomaton = new Automaton<SequenceTransition>()

        for (let path of paths) {
            for (let transition of path) {
                if (!optimizedAutomaton.findState(transition.from.name)) {
                    optimizedAutomaton.addState(transition.from)
                }
                if (!optimizedAutomaton.findState(transition.to.name)) {
                    optimizedAutomaton.addState(transition.to)
                }
                optimizedAutomaton.addTransition(transition)
            }
        }

        return optimizedAutomaton
    }

}