import { State } from "./state"
import { Instruction } from "./instruction"
import { Transition } from "./transition"
import { Algebra } from "sparqljs"
import { rdf } from "../../../../api"


/**
 * @author Julien Aimonier-Davat
 */
export class PropertyTransition extends Transition {
    private _instruction: Instruction

    constructor(from: State, to: State, instruction: Instruction) {
        super(from, to)
        this._instruction = instruction
    }

    get instruction(): Instruction {
        return this._instruction
    }

    private instructions2sparql(subject: string, object: string, joinPrefix: string = 'tythorJoin', filterPrefix: string = 'tythorFilter'): 
    [Array<Algebra.TripleObject>, Array<Algebra.FilterNode>] {
        let triples = new Array<Algebra.TripleObject>()
        let filters = new Array<Algebra.FilterNode>()
        
        triples.push({
            subject: this.instruction.inverse ? object : subject,
            predicate: this.instruction.negation ? `?${filterPrefix}_${0}` : this.instruction.properties[0],
            object: this.instruction.inverse ? subject : object
        })
        if (this.instruction.negation) {
            filters.push(this.buildFilter(`?${filterPrefix}_${0}`, this.instruction.properties))
        }

        return [triples, filters]
    }

    public buildQuery(subject: string, object: string, joinPrefix: string = 'tythorJoin', filterPrefix: string = 'tythorFilter'): Algebra.RootNode {
        let [triples, filters] = this.instructions2sparql(subject, object, joinPrefix, filterPrefix)

        let bgp: Algebra.BGPNode = {
            type: 'bgp',
            triples: triples
        }
        let group: Algebra.GroupNode = {
            type: 'group',
            patterns: [bgp, ...filters]
        }
        let query: Algebra.RootNode = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: {},
            variables: [subject, object].filter((variable) => rdf.isVariable(variable)),
            where: [group]
        }
        return query
    }

    public supportStarQuery(): boolean {
        return true
    }

    public buildStarQuery(subject: string, object: string, depth: number, joinPrefix: string = 'tythorJoin', filterPrefix: string = 'tythorFilter'): Algebra.RootNode {
        if (depth === 1) {
            return this.buildQuery(subject, object, `joinPrefix_${depth}`, `filterPrefix_${depth}`)
        }
        let varIndex = 0
        let bgp: Algebra.BGPNode = {
            type: 'bgp',
            triples: []
        }
        let group: Algebra.GroupNode = {
            type: 'group',
            patterns: []
        }
        let [triples, filters] = this.instructions2sparql(subject, `?tythorStarVar_${varIndex}`, `joinPrefix_${1}`, `filterPrefix_${1}`)
        bgp.triples.push(...triples)
        group.patterns.push(...filters)
        for (let i = 2; i < depth; i++) {
            [triples, filters] = this.instructions2sparql(`?tythorStarVar_${varIndex}`, `?tythorStarVar_${++varIndex}`, `joinPrefix_${i}`, `filterPrefix_${i}`)
            bgp.triples.push(...triples)
            group.patterns.push(...filters)
        }
        [triples, filters] = this.instructions2sparql(`?tythorStarVar_${varIndex}`, object, `joinPrefix_${depth}`, `filterPrefix_${depth}`)
        bgp.triples.push(...triples)
        group.patterns.push(...filters)
        group.patterns.unshift(bgp)
        let query: Algebra.RootNode = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: {},
            variables: [subject, object].filter((variable) => rdf.isVariable(variable)),
            where: [group]
        }
        return query
    }

    public print(marginLeft: number): void {
        console.log(`${" ".repeat(marginLeft)}> Transition{
            from: ${this.from.name}, 
            to: ${this.to.name},
            instruction: ${JSON.stringify(this._instruction)}
        }`)
    }

    public equals(other: PropertyTransition): boolean {
        return super.equals(other) && this.instruction.equals(other.instruction)
    }
}