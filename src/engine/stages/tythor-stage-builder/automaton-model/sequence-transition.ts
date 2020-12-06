import { State } from "./state"
import { Instruction } from "./instruction"
import { Algebra } from "sparqljs"
import { rdf, Graph, ExecutionContext, PipelineStage, Bindings } from "../../../../api"
import { NonTransitiveTransition } from "./non-transitive-transition"


/**
 * @author Julien Aimonier-Davat
 */
export class SequenceTransition extends NonTransitiveTransition {
    private _instructions: Array<Instruction>

    constructor(from: State, to: State) {
        super(from, to)
        this._instructions = new Array<Instruction>()
    }

    get instructions(): Instruction[] {
        return this._instructions
    }

    public merge(transition: SequenceTransition): void {
        if (!this.to.equals(transition.from)) {
            throw new Error(`A transition to node ${this.to.name} cannot be merged with a transition from node ${transition.from.name}`)
        }
        this.to = transition.to
        this.instructions.push(...transition.instructions)
    }

    private buildBGP(subject: string, object: string): Algebra.GroupNode {
        let triples = new Array<Algebra.TripleObject>()
        let filters = new Array<Algebra.FilterNode>()
        
        let joinVar = 0
        let filterVar = 0

        for (let index = 0, len = this.instructions.length; index < len; index++) {
            let tripleSubject = (index === 0) ? subject : `?tythorJoin_${joinVar}`
            let tripleObject = (index === len - 1) ? object : `?tythorJoin_${joinVar + 1}`
            let instruction = this.instructions[index]
            triples.push({
                subject: instruction.inverse ? tripleObject : tripleSubject,
                predicate: instruction.negation ? `?tythorFilter_${filterVar}` : instruction.properties[0],
                object: instruction.inverse ? tripleSubject : tripleObject
            })
            if (instruction.negation) {
                filters.push(this.buildFilter(`?tythorFilter_${filterVar}`, instruction.properties))
            }
            joinVar++
            filterVar++
        }
        return {
            type: 'group',
            patterns: [{
                type: 'bgp',
                triples: triples
            } as Algebra.BGPNode, ...filters]
        }
    }

    private buildConjunctiveQuery(subject: string, object: string): Algebra.RootNode {
        let query: Algebra.RootNode = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: {},
            variables: [subject, object].filter((variable) => rdf.isVariable(variable)),
            where: [this.buildBGP(subject, object)]
        }
        return query
    }

    public eval(subject: string, object: string, graph: Graph, context: ExecutionContext): PipelineStage<Bindings> {
        let query = this.buildConjunctiveQuery(subject, object)
        return graph.evalQuery(query, context)
    }

    public print(marginLeft: number): void {
        console.log(`${" ".repeat(marginLeft)}> Transition{
            from: ${this.from.name}, 
            to: ${this.to.name},
            instructions: ${JSON.stringify(this._instructions)}
        }`)
    }

    public equals(other: SequenceTransition): boolean {
        if (!this.from.equals(other.from) || !this.to.equals(other.to)) {
            return false
        } else if (this.instructions.length !== other.instructions.length) {
            return false
        } else {
            for (let i = 0; i < this.instructions.length; i++) {
                if (!this.instructions[i].equals(other.instructions[i])) {
                    return false
                }
            }
            return true
        }
    }
}