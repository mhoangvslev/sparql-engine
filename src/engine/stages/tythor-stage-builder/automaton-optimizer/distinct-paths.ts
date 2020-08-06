import { Automaton } from '../automaton-model/automaton'
import { SequenceTransition } from '../automaton-model/sequence-transition'
import { cloneDeep } from 'lodash'

/**
 * @author Julien Aimonier-Davat
 */
export class DistinctPathsOptimizer {

    public optimize (automaton: Automaton<SequenceTransition>): Automaton<SequenceTransition> {
        let optimizedAutomaton = new Automaton<SequenceTransition>()

        for (let state of automaton.states) {
            optimizedAutomaton.addState(cloneDeep(state))
        }


        for (let i = 0; i < automaton.transitions.length; i++) {
            let duplicate = false
            for (let j = 0; j < optimizedAutomaton.transitions.length && !duplicate; j++) {
                if (automaton.transitions[i].equals(optimizedAutomaton.transitions[j])) {
                    duplicate = true
                }
            }
            if (!duplicate) {
                let transition = automaton.transitions[i]
                let from = optimizedAutomaton.findState(transition.from.name)!
                let to = optimizedAutomaton.findState(transition.to.name)!
                let instructions = cloneDeep(transition.instructions)
                let newTransition = new SequenceTransition(from, to)
                newTransition.instructions.push(...instructions)
                optimizedAutomaton.transitions.push(newTransition)
            }
        }

        return optimizedAutomaton
    }

}