import { Automaton } from '../automaton-model/automaton'
import { State } from '../automaton-model/state'
import { SequenceTransition } from '../automaton-model/sequence-transition'
import { Instruction } from '../automaton-model/instruction'
import { cloneDeep } from 'lodash'
import { PropertyTransition } from '../automaton-model/property-transition'
import { isClosureTransition } from '../utils'

/**
 * @author Julien Aimonier-Davat
 */
export class StatesMergingOptimizer {

    private equivalentStates(stateA: number, stateB: number, neighboursA: Set<number>, neighboursB: Set<number>, automaton: Automaton<PropertyTransition>): boolean {
        if (neighboursA.size !== neighboursB.size) {
            return false
        } else if (automaton.findState(stateA)!.isFinal !== automaton.findState(stateB)!.isFinal) {
            return false
        } else {
            for (let next of neighboursA) {
                if (!neighboursB.has(next)) {
                    return false
                }
            }
            return true
        }
    }

    public optimize(automaton: Automaton<PropertyTransition>): Automaton<PropertyTransition> {
        
        let states = new Map<number, number>()
        let transitions = new Map<number, Set<number>>()

        for (let state of automaton.states) {
            states.set(state.name, state.name)
            transitions.set(state.name, new Set<number>())
        }
        for (let transtion of automaton.transitions) {
            transitions.get(transtion.from.name)!.add(transtion.to.name)
        }
        
        for (let [nodeA, neighboursA] of transitions) {
            for (let [nodeB, neighboursB] of transitions) {
                if (nodeA != nodeB && states.get(nodeA) !== states.get(nodeB) 
                && this.equivalentStates(nodeA, nodeB, neighboursA, neighboursB, automaton)) {
                    states.set(nodeB, nodeA)
                    transitions.set(nodeB, new Set<number>())
                }
            }
        }

        let optimizedAutomaton = new Automaton<PropertyTransition>()

        for (let [oldId, newId] of states) {
            if (!optimizedAutomaton.findState(newId)) {
                optimizedAutomaton.addState(cloneDeep(automaton.findState(oldId)!))
            }
        }

        for (let [oldId, neighbours] of transitions) {
            let newId = states.get(oldId)!
            for (let neighbourOldId of neighbours) {
                let neighbourNewId = states.get(neighbourOldId)!
                let transition = cloneDeep(
                    automaton.findTransition(
                        automaton.findState(oldId)!, 
                        automaton.findState(neighbourOldId)!
                    )!
                )
                transition.from = optimizedAutomaton.findState(newId)!
                transition.to = optimizedAutomaton.findState(neighbourNewId)!
                if (isClosureTransition(transition)) {
                    transition.automaton = this.optimize(transition.automaton)
                }
                optimizedAutomaton.addTransition(transition)
            }
        }

        return optimizedAutomaton
    }

}