import { Automaton } from '../automaton-model/automaton'
import { State } from '../automaton-model/state'
import { SequenceTransition } from '../automaton-model/sequence-transition'
import { Instruction } from '../automaton-model/instruction'
import { cloneDeep } from 'lodash'

/**
 * @author Julien Aimonier-Davat
 */
export class StatesMergingOptimizer {

    private compareInstructions(left: Instruction[], right: Instruction[]): boolean {
        if (left.length !== right.length) {
            return false
        }
        for (let i = 0; i < left.length; i++) {
            if (!left[i].equals(right[i])) {
                return false
            }
        }
        return true
    }

    private compareTransitions(left: SequenceTransition, right: SequenceTransition): boolean {
        return left.to.name === right.to.name && this.compareInstructions(left.instructions, right.instructions)
    }

    private compareStates(automaton: Automaton<SequenceTransition>, left: State, right: State): boolean {
        if (left.isInitial !== right.isInitial || left.isFinal !== right.isFinal) {
            return false
        }
        for (let leftTransition of automaton.findTransitionsFrom(left)) {
            let existsEquivalentRightTransition = false
            for (let rightTransition of automaton.findTransitionsFrom(right)) {
                if (this.compareTransitions(leftTransition, rightTransition)) {
                    existsEquivalentRightTransition = true
                    break
                }
            }
            if (!existsEquivalentRightTransition) {
                return false
            }
        }
        return true
    }

    private computeEquivalencies(automaton: Automaton<SequenceTransition>, equivalencies: Map<number, Array<number>>) {
        let update = false
        do {
            update = false
            for (let state1 of automaton.states) {
                for (let state2 of automaton.states) {
                    if (equivalencies.get(state1.name)!.includes(state2.name)) {
                        continue
                    }
                    if (this.compareStates(automaton, state1, state2)) {
                        equivalencies.get(state1.name)!.push(state2.name)
                        equivalencies.get(state2.name)!.push(state1.name)
                        update = true
                    }
                }
            }
        } while (update)        
    }

    public optimize(automaton: Automaton<SequenceTransition>): Automaton<SequenceTransition> {
        let optimizedAutomaton = new Automaton<SequenceTransition>()

        let equivalencies = new Map<number, Array<number>>()

        for (let state of automaton.states) {
            equivalencies.set(state.name, new Array<number>())
        }

        this.computeEquivalencies(automaton, equivalencies)

        let agents = new Map<number, State>()
        let state2agent = new Map<number, number>()

        let agent = 0
        for (let state of equivalencies.keys()) {
            if (state2agent.get(state) === undefined) {
                state2agent.set(state, agent)
                for (let equivalentState of equivalencies.get(state)!) {
                    state2agent.set(equivalentState, agent)  
                }
                let agentSate = new State(agent, automaton.findState(state)!.isInitial, automaton.findState(state)!.isFinal)
                agents.set(agent, agentSate)
                agent++
            }
            
        }

        for (let state of agents.values()) {
            optimizedAutomaton.addState(state)
        }

        for (let transition of automaton.transitions) {
            let from = agents.get(state2agent.get(transition.from.name)!)!
            let to = agents.get(state2agent.get(transition.to.name)!)!
            let instructions = cloneDeep(transition.instructions)
            let newTransition = new SequenceTransition(from, to)
            newTransition.instructions.push(...instructions)
            optimizedAutomaton.addTransition(newTransition)
        }

        return optimizedAutomaton
    }

}