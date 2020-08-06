import { Automaton } from '../automaton-model/automaton'
import { State } from '../automaton-model/state'
import { SequenceTransition } from '../automaton-model/sequence-transition'
import { cloneDeep } from 'lodash'
import { PropertyTransition } from '../automaton-model/property-transition'


/**
 * @author Julien Aimonier-Davat
 */
export class PathsCompressionOptimizer {

    private hasSelfTransition(automaton: Automaton<PropertyTransition>, state: State): boolean {
        for (let transition of automaton.findTransitionsFrom(state)) {
            if (transition.from.name === transition.to.name) {
                return true
            }
        }
        return false
    }

    private buildPathsFrom(automaton: Automaton<PropertyTransition>, state: State): SequenceTransition[] {
        let paths = new Array<SequenceTransition>()
        let stack = new Array<SequenceTransition>()
        
        for (let transition of automaton.findTransitionsFrom(state)) {
            let multiPredicateTransition = new SequenceTransition(transition.from, transition.to)
            multiPredicateTransition.instructions.push(transition.instruction)
            stack.push(multiPredicateTransition)
        }

        while (stack.length > 0) {
            let transition = stack.pop()!

            if (transition.to.isFinal || this.hasSelfTransition(automaton, transition.to)) {
                paths.push(transition)
            } else {
                for (let nextTransition of automaton.findTransitionsFrom(transition.to)) {
                    let multiPredicateTransition = new SequenceTransition(nextTransition.from, nextTransition.to)
                    multiPredicateTransition.instructions.push(nextTransition.instruction)
                    let newTransition = cloneDeep(transition)
                    newTransition.merge(multiPredicateTransition)
                    stack.push(newTransition)
                }
            }           
        }

        return paths
    }

    private buildPaths(automaton: Automaton<PropertyTransition>): SequenceTransition[] {
        let paths = new Array<SequenceTransition>()

        let visited = new Set<number>()
        let stack = new Array<State>()

        let initialState: State = automaton.findInitialStates()[0]
        stack.push(initialState)
        visited.add(initialState.name)

        while (stack.length > 0) {
            let currentState = stack.pop()!
            let pathsFromCurrentState: SequenceTransition[] = this.buildPathsFrom(automaton, currentState)
            
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

    public optimize(automaton: Automaton<PropertyTransition>): Automaton<SequenceTransition> {
        let paths = this.buildPaths(automaton)
        let optimizedAutomaton = new Automaton<SequenceTransition>()

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