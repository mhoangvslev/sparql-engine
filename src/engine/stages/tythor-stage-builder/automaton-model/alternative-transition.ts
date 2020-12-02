import { State } from "./state"
import { Instruction } from "./instruction"
import { Transition } from "./transition"
import { Algebra } from "sparqljs"
import { rdf } from "../../../../api"
import { SequenceTransition } from "./sequence-transition"


/**
 * @author Julien Aimonier-Davat
 */
export class AlternativeTransition extends Transition {
    private _instructions: Array<Array<Instruction>>

    constructor(from: State, to: State) {
        super(from, to)
        this._instructions = new Array<Array<Instruction>>()
    }

    get instructions(): Instruction[][] {
        return this._instructions
    }

    public buildQuery(subject: string, object: string, joinPrefix: string = 'tythorJoin', filterPrefix: string = 'tythorFilter'): Algebra.RootNode {
        if (this.instructions.length === 1) {
            let transition = new SequenceTransition(this.from, this.to)
            transition.instructions.push(...this.instructions[0])
            return transition.buildQuery(subject, object, joinPrefix, filterPrefix)
        }
        
        let query: Algebra.RootNode = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: {},
            variables: [subject, object].filter((variable) => rdf.isVariable(variable)),
            where: []
        }

        let union: Algebra.GroupNode = {
            type: 'union',
            patterns: this.instructions.map((path) => {
                let transition = new SequenceTransition(this.from, this.to)
                transition.instructions.push(...path)
                return transition.buildQuery(subject, object, joinPrefix, filterPrefix).where[0]
            })
        }
        query.where = [union]

        return query
    }

    public print(marginLeft: number): void {
        console.log(`${" ".repeat(marginLeft)}> Transition{
            from: ${this.from.name}, 
            to: ${this.to.name},
            instructions: ${JSON.stringify(this._instructions)}
        }`)
    }

    public equals(other: AlternativeTransition): boolean {
        if (!this.from.equals(other.from) || !this.to.equals(other.to)) {
            return false
        } else if (this.instructions.length !== other.instructions.length) {
            return false
        } else {
            for (let i = 0; i < this.instructions.length; i++) {
                if (this.instructions[i].length !== other.instructions[i].length) {
                    return false
                } else {
                    for (let j = 0; j < this.instructions[i].length; j++) {
                        if (!this.instructions[i][j].equals(other.instructions[i][j])) {
                            return false
                        }
                    }
                }
            }
            return true
        }
    }
}