import { Automaton } from '../automaton-model/automaton'
import { SequenceTransition } from '../automaton-model/sequence-transition'
import { AlternativeTransition } from '../automaton-model/alternative-transition'
import { cloneDeep } from 'lodash'

/**
 * @author Julien Aimonier-Davat
 */
export class PathsMergingOptimizer {

    public optimize(automaton: Automaton<SequenceTransition>): Automaton<AlternativeTransition> {
        let optimizedAutomaton = new Automaton<AlternativeTransition>()

        for (let state of automaton.states) {
            optimizedAutomaton.addState(cloneDeep(state))
        }

        let visited = new Array<number>()
        for (let i = 0; i < automaton.transitions.length; i++) {
            if (!visited.includes(i)) {
                visited.push(i)
                let t1 = automaton.transitions[i]
                let from = optimizedAutomaton.findState(t1.from.name)!
                let to = optimizedAutomaton.findState(t1.to.name)!
                let transition = new AlternativeTransition(from, to)
                transition.instructions.push(cloneDeep(t1.instructions))     
                for (let j = 0; j < automaton.transitions.length; j++) {
                    let t2 = automaton.transitions[j]
                    if (!visited.includes(j) && t2.from.name === t1.from.name && t2.to.name === t1.to.name) {
                        visited.push(j)
                        transition.instructions.push(cloneDeep(t2.instructions))
                    }
                }
                optimizedAutomaton.transitions.push(transition)   
            }
        }

        return optimizedAutomaton
    }

}