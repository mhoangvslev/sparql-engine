import { State } from "./state"
import { Instruction } from "./instruction"
import { Algebra } from "sparqljs"
import { rdf, Graph, ExecutionContext, PipelineStage, Bindings } from "../../../../api"
import { NonTransitiveTransition } from "./non-transitive-transition"


/**
 * @author Julien Aimonier-Davat
 */
export class PropertyTransition extends NonTransitiveTransition {
    private _instruction: Instruction

    constructor(from: State, to: State, instruction: Instruction) {
        super(from, to)
        this._instruction = instruction
    }

    get instruction(): Instruction {
        return this._instruction
    }

    private buildBGP(subject: string, object: string): Algebra.GroupNode {
        let triples = new Array<Algebra.TripleObject>()
        let filters = new Array<Algebra.FilterNode>()
        
        triples.push({
            subject: this.instruction.inverse ? object : subject,
            predicate: this.instruction.negation ? `?tythorFilter_0` : this.instruction.properties[0],
            object: this.instruction.inverse ? subject : object
        })
        if (this.instruction.negation) {
            filters.push(this.buildFilter(`?tythorFilter_0`, this.instruction.properties))
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
            instruction: ${JSON.stringify(this._instruction)}
        }`)
    }

    public equals(other: PropertyTransition): boolean {
        return super.equals(other) && this.instruction.equals(other.instruction)
    }
}