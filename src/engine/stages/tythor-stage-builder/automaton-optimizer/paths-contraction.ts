import { Automaton } from './../automaton-model/automaton'
import { State } from './../automaton-model/automaton-state'
import { Transition } from './../automaton-model/automaton-transition'
import { cloneDeep } from 'lodash'

export class PathsContractionOptimizer {

    private hasSelfTransition(automaton: Automaton, state: State): boolean {
        for (let transition of automaton.findTransitionsFrom(state)) {
            if (transition.from.name === transition.to.name) {
                return true
            }
        }
        return false
    }

    private buildPathsFrom(automaton: Automaton, state: State): Transition[] {
        let paths = new Array<Transition>()
        let stack = new Array<Transition>()
        
        for (let transition of automaton.findTransitionsFrom(state)) {
            stack.push(transition)
        }

        while (stack.length > 0) {
            let transition = stack.pop()!

            if (transition.to.isFinal || this.hasSelfTransition(automaton, transition.to)) {
                paths.push(transition)
            } else {
                for (let nextTransition of automaton.findTransitionsFrom(transition.to)) {
                    let newTransition = cloneDeep(transition)
                    newTransition.merge(nextTransition)
                    stack.push(newTransition)
                }
            }           
        }

        return paths
    }

    private buildPaths(automaton: Automaton): Transition[] {
        let paths = new Array<Transition>()

        let visited = new Set<number>()
        let stack = new Array<State>()

        let initialState: State = automaton.findInitialStates()[0]
        stack.push(initialState)
        visited.add(initialState.name)

        while (stack.length > 0) {
            let currentState = stack.pop()!
            let pathsFromCurrentState: Transition[] = this.buildPathsFrom(automaton, currentState)
            
            paths.push(...pathsFromCurrentState)

            for (let path of pathsFromCurrentState) {
                if (!visited.has(path.to.name)) {
                    stack.push(path.to)
                    visited.add(path.to.name)
                }
            }
        }

        return paths
    }

    public optimize(automaton: Automaton): Automaton {
        let paths = this.buildPaths(automaton)
        let optimizedAutomaton = new Automaton()

        for (let path of paths) {
            if (!optimizedAutomaton.findState(path.from.name)) {
                optimizedAutomaton.addState(path.from)
            }
            if (!optimizedAutomaton.findState(path.to.name)) {
                optimizedAutomaton.addState(path.to)
            }
            optimizedAutomaton.addTransition(path)
        }

        return optimizedAutomaton
    }

}