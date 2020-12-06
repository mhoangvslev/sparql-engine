import { Automaton } from '../automaton-model/automaton'
import { State } from '../automaton-model/state'
import { SequenceTransition } from '../automaton-model/sequence-transition'
import { Instruction } from '../automaton-model/instruction'
import { cloneDeep } from 'lodash'
import { PropertyTransition } from '../automaton-model/property-transition'
import { isTransitiveTransition } from '../utils'

/**
 * @author Julien Aimonier-Davat
 */
export class StatesMergingOptimizer {

    private areEquivalentStates(stateA: number, stateB: number, neighboursA: Set<number>, neighboursB: Set<number>, automaton: Automaton<PropertyTransition>): boolean {
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
            let equivalentStates = []
            for (let [nodeB, neighboursB] of transitions) {
                if (nodeA != nodeB && states.get(nodeA) !== states.get(nodeB) 
                && this.areEquivalentStates(nodeA, nodeB, neighboursA, neighboursB, automaton)) {
                    equivalentStates.push(nodeB)  
                }
            }
            let max = nodeA
            for (let state of equivalentStates) {
                max = state > max ? state : max
            }
            for (let state of equivalentStates) {
                states.set(state, max)
                transitions.set(state, new Set<number>())
            }
            states.set(nodeA, max)
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
                optimizedAutomaton.addTransition(transition)
            }
        }

        return optimizedAutomaton
    }

}