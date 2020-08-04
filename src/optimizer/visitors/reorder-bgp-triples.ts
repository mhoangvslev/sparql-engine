import PlanVisitor from "../plan-visitor";
import { Algebra } from "sparqljs"
import { rdf } from "../../api"
import { cloneDeep, isEqual } from "lodash"

class ReorderRules {
    public static TERM: number = 1
    public static VAR: number = 2
    public static PATH: number = 4

    public static MAX_WEIGHT = 100

    public static patterns: PatternTriple[] = [
        {subject: ReorderRules.TERM, predicate: ReorderRules.TERM, object: ReorderRules.TERM, weigth: 1},

        {subject: ReorderRules.TERM, predicate: ReorderRules.TERM, object: ReorderRules.VAR, weigth: 15},
        {subject: ReorderRules.TERM, predicate: ReorderRules.VAR, object: ReorderRules.TERM, weigth: 20},
        {subject: ReorderRules.VAR, predicate: ReorderRules.TERM, object: ReorderRules.TERM, weigth: 25},

        {subject: ReorderRules.TERM, predicate: ReorderRules.VAR, object: ReorderRules.VAR, weigth: 30},
        {subject: ReorderRules.VAR, predicate: ReorderRules.VAR, object: ReorderRules.TERM, weigth: 35},
        {subject: ReorderRules.VAR, predicate: ReorderRules.TERM, object: ReorderRules.VAR, weigth: 40},

        {subject: ReorderRules.VAR, predicate: ReorderRules.VAR, object: ReorderRules.VAR, weigth: 90},

        {subject: ReorderRules.TERM, predicate: ReorderRules.PATH, object: ReorderRules.TERM, weigth: 2},

        {subject: ReorderRules.TERM, predicate: ReorderRules.PATH, object: ReorderRules.VAR, weigth: 8},
        {subject: ReorderRules.VAR, predicate: ReorderRules.PATH, object: ReorderRules.TERM, weigth: 10},

        {subject: ReorderRules.VAR, predicate: ReorderRules.PATH, object: ReorderRules.VAR, weigth: 100}
    ]
}

interface PatternTriple {
    subject: number
    predicate: number
    object: number
    weigth: number
}

/**
 * Implements a static join ordering algorithm based on counting-variable algorithm
 * @author Julien AIMONIER-DAVAT
 */
export default class ReorderBasicGraphPatternTriples extends PlanVisitor {
    
    private getWeight(triple: Algebra.TripleObject|Algebra.PathTripleObject, boundVariables: Array<string>): number {
        let subject = ReorderRules.VAR
        let predicate = ReorderRules.VAR
        let object = ReorderRules.VAR
        
        if (!rdf.isVariable(triple.subject)) {
            subject = ReorderRules.TERM
        } 

        if (typeof triple.predicate === 'string' && !rdf.isVariable(triple.predicate)) {
            predicate = ReorderRules.TERM  
        } else {
            predicate = ReorderRules.PATH
        }

        if (!rdf.isVariable(triple.object)) {
            object = ReorderRules.TERM
        } 

        for (let pattern of ReorderRules.patterns) {
            if (pattern.subject === subject && pattern.predicate === predicate && pattern.object === object) {
                if (typeof triple.predicate !== 'string' && ['*','+'].includes(triple.predicate.pathType)) {
                    return pattern.weigth + 1
                }
                return pattern.weigth
            }
        }

        return ReorderRules.MAX_WEIGHT
    }

    private selectMinWeightedTriple(triples: Array<Algebra.TripleObject|Algebra.PathTripleObject>, boundVariables: Array<string>): Algebra.TripleObject|Algebra.PathTripleObject {
        let minWeight = this.getWeight(triples[0], boundVariables)
        let tripleIndex = 0
        for (let i = 1, len = triples.length; i < len; i++) {
            let weigth = this.getWeight(triples[i], boundVariables)
            if (minWeight > weigth) {
                minWeight = weigth
                tripleIndex = i
            }
        }
        return triples.splice(tripleIndex, 1)[0]
    }

    private selectMinWeightedJoinTriple(triples: Array<Algebra.TripleObject|Algebra.PathTripleObject>, boundVariables: Array<string>): Algebra.TripleObject|Algebra.PathTripleObject|undefined {
        let joinTriples = triples.filter((triple) => {
            if (boundVariables.includes(triple.subject) || boundVariables.includes(triple.object)) {
                return true
            } else if (typeof triple.predicate === 'string') {
                return boundVariables.includes(triple.predicate)
            } else {
                return false
            }
        })

        if (joinTriples.length === 0) {
            return undefined
        }
        
        let selectedTriple = this.selectMinWeightedTriple(joinTriples, boundVariables)
        
        for (let i = 0; i < triples.length; i++) {
            if (isEqual(triples[i], selectedTriple)) {
                return triples.splice(i, 1)[0]
            }
        }

        throw new Error('Something went wrong during join ordering...')
    }

    private updateBoundVariable(triple: Algebra.TripleObject|Algebra.PathTripleObject, boundVariables: Array<string>): void {
        if (rdf.isVariable(triple.subject) && !boundVariables.includes(triple.subject)) {
            boundVariables.push(triple.subject)
        }
        if (typeof triple.predicate === 'string' && rdf.isVariable(triple.predicate) && !boundVariables.includes(triple.predicate)) {
            boundVariables.push(triple.predicate)
        }
        if (rdf.isVariable(triple.object) && !boundVariables.includes(triple.object)) {
            boundVariables.push(triple.object)
        }
    }

    private reorder(triples: Array<Algebra.TripleObject|Algebra.PathTripleObject>): Array<Algebra.TripleObject|Algebra.PathTripleObject> {
        let nonOrderedTriples = cloneDeep(triples)
        let orderedTriples = new Array<Algebra.TripleObject|Algebra.PathTripleObject>()
        let boundVariables = new Array<string>()

        while (nonOrderedTriples.length > 0) {
            let joinTriple = this.selectMinWeightedJoinTriple(nonOrderedTriples, boundVariables)
            if (joinTriple === undefined) {
                let triple = this.selectMinWeightedTriple(nonOrderedTriples, boundVariables)
                this.updateBoundVariable(triple, boundVariables)
                orderedTriples.push(triple)
            } else {
                this.updateBoundVariable(joinTriple, boundVariables)
                orderedTriples.push(joinTriple)
            }
        }

        return orderedTriples
    }

    /**
     * Visit and transform a Basic Graph Pattern node.
     * Use static join ordering algorithm to reorder BGP triple patterns
     * @param  node - Basic Graph Pattern node
     * @return The transformed Basic Graph Pattern node
     */
    visitBGP (node: Algebra.BGPNode): Algebra.PlanNode {
        let orderedTriples = this.reorder(node.triples)

        let newNode: Algebra.GroupNode = {
            type: 'group',
            patterns: []
        }

        let basicTriple = typeof orderedTriples[0].predicate === 'string'
        let bgp: Algebra.BGPNode = {
            type: 'bgp',
            triples: []
        }
        for (let triple of orderedTriples) {
            if (basicTriple && typeof triple.predicate === 'string') {
                bgp.triples.push(triple)
            } else if (!basicTriple && typeof triple.predicate !== 'string') {
                bgp.triples.push(triple)
            } else {
                newNode.patterns.push(bgp)
                basicTriple = !basicTriple
                bgp = {type: 'bgp', triples: [triple]}
            }
        }
        if (bgp.triples.length > 0) {
            newNode.patterns.push(bgp)
        }
       
        return newNode
    }
}