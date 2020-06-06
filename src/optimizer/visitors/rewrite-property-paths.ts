/* file : rewrite-property-paths.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

import PlanVisitor from '../plan-visitor'
import { Algebra } from 'sparqljs'
import { cloneDeep, partition } from 'lodash'

function isPathTripleObject (triple: Algebra.PathTripleObject | Algebra.TripleObject): triple is Algebra.PathTripleObject {
    if (typeof triple.predicate !== 'string') {
        return true
    }
    return false
}

/**
 * Implements a simple Property Path rewriting: non-transitive expression are extracted and injected in the BGP
 * @author Julien AIMONIER-DAVAT
 */
export default class RewritePropertyPaths extends PlanVisitor {
    
    private _numVariable: number

    constructor() {
        super()
        this._numVariable = 0
    }

    /**
     * Visit and transform a Basic Graph Pattern node.
     * Non-transitive expressions of Property Path patterns are rewritten.
     * @param  node - Basic Graph Pattern node
     * @return The transformed Basic Graph Pattern node
     */
    visitBGP (node: Algebra.BGPNode): Algebra.PlanNode {
        let newNode = cloneDeep(node) 
        for (let i = 0; i < newNode.triples.length; i++) {
            let triple = newNode.triples[i]
            if (isPathTripleObject(triple)) {
                newNode.triples.splice(i, 1)
                return this.visitPropertyPath(triple, newNode.triples)
            }
        }
        return newNode
    }

    visitSequenceExpression (pathTriple: Algebra.PathTripleObject, context: Array<Algebra.TripleObject|Algebra.PathTripleObject>): Algebra.PlanNode {
        let node: Algebra.BGPNode = {
            triples: cloneDeep(context),
            type: 'bgp'
        }
        node.triples.push({
            subject: pathTriple.subject,
            predicate: cloneDeep(pathTriple.predicate.items[0]),
            object: `?tythorVar_${this._numVariable}`
        } as Algebra.TripleObject | Algebra.PathTripleObject)
        let sequenceLength = pathTriple.predicate.items.length
        for (let i = 1; i < sequenceLength - 1; i++) {
            node.triples.push({
                subject: `?tythorVar_${this._numVariable}`,
                predicate: cloneDeep(pathTriple.predicate.items[i]),
                object: `?tythorVar_${++this._numVariable}`
            } as Algebra.TripleObject | Algebra.PathTripleObject)
        }
        node.triples.push({
            subject: `?tythorVar_${this._numVariable}`,
            predicate: cloneDeep(pathTriple.predicate.items[sequenceLength - 1]),
            object: pathTriple.object
        } as Algebra.TripleObject | Algebra.PathTripleObject)
        this._numVariable++
        return this.visit(node)
    }

    visitAlternativeExpression (pathTriple: Algebra.PathTripleObject, context: Array<Algebra.TripleObject|Algebra.PathTripleObject>): Algebra.PlanNode {
        let node: Algebra.GroupNode = {
            patterns: [],
            type: 'union'
        }
        for (let expression of pathTriple.predicate.items) {
            let bgp: Algebra.BGPNode = {
                triples: cloneDeep(context),
                type: 'bgp'
            }
            bgp.triples.push({
                subject: pathTriple.subject,
                predicate: cloneDeep(expression),
                object: pathTriple.object
            } as Algebra.TripleObject | Algebra.PathTripleObject)
            node.patterns.push(bgp)
        }
        return this.visit(node)
    }

    visitInverseExpression (pathTriple: Algebra.PathTripleObject, context: Array<Algebra.TripleObject|Algebra.PathTripleObject>): Algebra.PlanNode {
        let node: Algebra.BGPNode = {
            triples: cloneDeep(context),
            type: 'bgp'
        }
        node.triples.push({
            subject: pathTriple.object,
            predicate: cloneDeep(pathTriple.predicate.items[0]),
            object: pathTriple.subject
        } as Algebra.TripleObject | Algebra.PathTripleObject)
        return this.visit(node)
    }

    visitNegatedExpression (pathTriple: Algebra.PathTripleObject, context: Array<Algebra.TripleObject|Algebra.PathTripleObject>): Algebra.PlanNode {
        
        function extractNegatedPredicates (predicates: Array<string | Algebra.PropertyPath>): [Array<string>, Array<string>] {
            let forward = []
            let backward = []

            for (let predicate of predicates) {
                if (typeof predicate === 'string') {
                    forward.push(predicate)
                } else {
                    backward.push(predicate.items[0] as string)
                }
            }
            return [forward, backward]
        }

        function buildFilter (variable: string, predicates: Array<string>): Algebra.FilterNode {
            let node: Algebra.FilterNode = {
                type: 'filter',
                expression: {
                    type: 'operation',
                    operator: '!=',
                    args: [variable, predicates[0]]
                }
            }
            for (let i = 1; i < predicates.length; i++) {
                let expression: Algebra.SPARQLExpression = {
                    type: 'operation',
                    operator: '&&',
                    args: [node.expression, {
                        type: 'operation',
                        operator: '!=',
                        args: [variable, predicates[i]]
                    }]
                }
                node.expression = expression
            }
            return node
        }
        
        let negatedPredicates = []
        if (typeof pathTriple.predicate.items[0] === 'string') {
            negatedPredicates = pathTriple.predicate.items
        } else if (pathTriple.predicate.items[0].pathType === '^') {
            negatedPredicates = pathTriple.predicate.items
        } else if (pathTriple.predicate.items[0].pathType === '|') {
            let alternativeExpression = pathTriple.predicate.items[0] as Algebra.PropertyPath
            negatedPredicates = alternativeExpression.items
        } else {
            throw new Error(`Unexpected operator ${pathTriple.predicate.items[0].pathType} as child of !`)
        }

        let [forward, backward] = extractNegatedPredicates(negatedPredicates)
        let node: Algebra.GroupNode
        if (forward.length > 0 && backward.length > 0) {
            node = {type: 'union', patterns: []}
        } else {
            node = {type: 'group', patterns: []}
        }

        if (forward.length > 0) {
            let bgp: Algebra.BGPNode = {triples: cloneDeep(context), type: 'bgp'}
            bgp.triples.push({
                subject: pathTriple.subject,
                predicate: `?tythorVar_${this._numVariable}`,
                object: pathTriple.object
            })
            node.patterns.push({
                type: 'group',
                patterns: [bgp, buildFilter(`?tythorVar_${this._numVariable}`, forward)]
            } as Algebra.PlanNode)
        }
        if (backward.length > 0) {
            let bgp: Algebra.BGPNode = {triples: cloneDeep(context), type: 'bgp'}
            bgp.triples.push({
                subject: pathTriple.object,
                predicate: `?tythorVar_${this._numVariable}`,
                object: pathTriple.subject
            })
            node.patterns.push({
                type: 'group',
                patterns: [bgp, buildFilter(`?tythorVar_${this._numVariable}`, backward)]
            } as Algebra.PlanNode)
        }
        this._numVariable++
        return node
    }

    visitZeroOrOneExpression (pathTriple: Algebra.PathTripleObject, context: Array<Algebra.TripleObject|Algebra.PathTripleObject>): Algebra.PlanNode {
        let node: Algebra.BGPNode = {
            type: 'bgp',
            triples: cloneDeep(context)
        }
        node.triples.push(pathTriple)
        return node
    }

    visitZeroOrMoreExpression (pathTriple: Algebra.PathTripleObject, context: Array<Algebra.TripleObject|Algebra.PathTripleObject>): Algebra.PlanNode {
        let node: Algebra.BGPNode = {
            type: 'bgp',
            triples: cloneDeep(context)
        }
        node.triples.push(pathTriple)
        return node
    }

    visitOneOrMoreExpression (pathTriple: Algebra.PathTripleObject, context: Array<Algebra.TripleObject|Algebra.PathTripleObject>): Algebra.PlanNode {
        // let node: Algebra.BGPNode = {
        //     type: 'bgp',
        //     triples: cloneDeep(context)
        // }
        // node.triples.push({
        //     subject: pathTriple.subject,
        //     predicate: pathTriple.predicate.items[0],
        //     object: `?tythorVar_${this._numVariable}`
        // } as Algebra.PathTripleObject | Algebra.TripleObject)
        // pathTriple.predicate.pathType = '*'
        // node.triples.push({
        //     subject: `?tythorVar_${this._numVariable}`,
        //     predicate: pathTriple.predicate,
        //     object: pathTriple.object
        // } as Algebra.PathTripleObject)
        // this._numVariable++
        // return this.visit(node)
        let node: Algebra.BGPNode = {
            type: 'bgp',
            triples: cloneDeep(context)
        }
        node.triples.push(pathTriple)
        return node
    }

    visitPropertyPath (pathTriple: Algebra.PathTripleObject, context: Array<Algebra.TripleObject|Algebra.PathTripleObject>): Algebra.PlanNode {
        switch (pathTriple.predicate.pathType) {
            case '/':
                return this.visitSequenceExpression(pathTriple, context)
            case '|':
                return this.visitAlternativeExpression(pathTriple, context)
            case '^':
                return this.visitInverseExpression(pathTriple, context)
            case '!':
                return this.visitNegatedExpression(pathTriple, context)
            case '?':
                return this.visitZeroOrOneExpression(pathTriple, context)
            case '*':
                return this.visitZeroOrMoreExpression(pathTriple, context)
            case '+':
                return this.visitOneOrMoreExpression(pathTriple, context)
            default:
                throw new Error(`Unsupported Property Path expression: ${pathTriple.predicate.pathType}`)
        }
    }
}