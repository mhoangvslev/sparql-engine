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
import { cloneDeep } from 'lodash'

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
        for (let i = 0; i < node.triples.length; i++) {
            let triple = node.triples[i]
            if (this.isPathTriple(triple)) {
                switch (triple.predicate.pathType) {
                    case '/':
                        let sequenceNode: Algebra.BGPNode = {triples: [], type: 'bgp'} 
                        sequenceNode.triples.push(...newNode.triples)
                        sequenceNode.triples.splice(i, 1)
                        sequenceNode.triples.push(...this.rewriteSequenceExpression(triple))
                        return this.visit(sequenceNode)
                    case '|':
                        let alternativeNode: Algebra.GroupNode = {patterns: [], type: 'union'}
                        for (let alternativeClause of this.rewriteAlternativeExpression(triple)) {
                            let clauseNode: Algebra.BGPNode = {triples: [], type: 'bgp'}
                            clauseNode.triples.push(...newNode.triples)
                            clauseNode.triples.splice(i, 1)
                            clauseNode.triples.push(alternativeClause)
                            alternativeNode.patterns.push(clauseNode)
                        }
                        return this.visit(alternativeNode)
                    case '^':
                        let inverseNode: Algebra.BGPNode = {triples: [], type: 'bgp'}
                        inverseNode.triples.push(...newNode.triples)
                        inverseNode.triples.splice(i, 1)
                        inverseNode.triples.push(this.rewriteInverseExpression(triple))
                        return this.visit(inverseNode)
                    case '!':
                        let [forward, backward] = this.extractNegatedPredicates(triple.predicate)
                        if (forward.length > 0 && backward.length === 0) {
                            let forwardGroup: Algebra.GroupNode = {patterns: [], type: 'group'}
                            let forwardBGP: Algebra.BGPNode = {triples: [], type: 'bgp'}
                            forwardBGP.triples.push(...newNode.triples)
                            forwardBGP.triples.splice(i, 1)
                            forwardBGP.triples.push({
                                subject: triple.subject,
                                predicate: `?tythorVar_${this._numVariable}`,
                                object: triple.object                 
                            })
                            forwardGroup.patterns.push(forwardBGP, this.buildFilter(`?tythorVar_${this._numVariable++}`, forward))
                            return this.visit(forwardGroup)
                        } else if (forward.length === 0 && backward.length > 0) {
                            let backwardGroup: Algebra.GroupNode = {patterns: [], type: 'group'}
                            let backwardBGP: Algebra.BGPNode = {triples: [], type: 'bgp'}
                            backwardBGP.triples.push(...newNode.triples)
                            backwardBGP.triples.splice(i, 1)
                            backwardBGP.triples.push({
                                subject: triple.object,
                                predicate: `?tythorVar_${this._numVariable}`,
                                object: triple.subject                 
                            })
                            backwardGroup.patterns.push(backwardBGP, this.buildFilter(`?tythorVar_${this._numVariable++}`, backward))
                            return this.visit(backwardGroup)
                        } else if (forward.length > 0 && backward.length > 0) {
                            let negationUnion: Algebra.GroupNode = {patterns: [], type: 'union'}
                            let forwardGroup: Algebra.GroupNode = {patterns: [], type: 'group'}
                            let backwardGroup: Algebra.GroupNode = {patterns: [], type: 'group'}
                            let forwardBGP: Algebra.BGPNode = {triples: [], type: 'bgp'}
                            let backwardBGP: Algebra.BGPNode = {triples: [], type: 'bgp'}
                            forwardBGP.triples.push(...newNode.triples)
                            forwardBGP.triples.splice(i, 1)
                            forwardBGP.triples.push({
                                subject: triple.subject,
                                predicate: `?tythorVar_${this._numVariable}`,
                                object: triple.object                 
                            })
                            forwardGroup.patterns.push(forwardBGP, this.buildFilter(`?tythorVar_${this._numVariable++}`, forward))
                            backwardBGP.triples.push(...newNode.triples)
                            backwardBGP.triples.splice(i, 1)
                            backwardBGP.triples.push({
                                subject: triple.object,
                                predicate: `?tythorVar_${this._numVariable}`,
                                object: triple.subject                 
                            })
                            backwardGroup.patterns.push(backwardBGP, this.buildFilter(`?tythorVar_${this._numVariable++}`, backward))
                            negationUnion.patterns.push(forwardGroup, backwardGroup)
                            return this.visit(negationUnion)
                        }
                        return newNode
                    case '*':
                    case '+':
                    case '?':
                    default:
                        break
                }
            } 
        }
        return newNode
    }

    private isPathTriple (triple: Algebra.TripleObject|Algebra.PathTripleObject): triple is Algebra.PathTripleObject {
        return typeof triple.predicate !== 'string'
    }

    private extractNegatedPredicates (expression: string|Algebra.PropertyPath): [Array<string>, Array<string>] {
        let forward = []
        let backward = []

        if (typeof expression === 'string') {
            forward.push(expression)
        } else if (expression.pathType === '^' && typeof expression.items[0] === 'string') {
            backward.push(expression.items[0])
        } else if (expression.pathType === '|') {
            for (let subexpression of expression.items) {
                if (typeof subexpression === 'string') {
                    forward.push(subexpression)
                } else if (subexpression.pathType === '^' && typeof subexpression.items[0] === 'string') {
                    backward.push(subexpression.items[0])
                }
            }
        }

        return [forward, backward]
    }

    private buildFilter (variable: string, predicates: Array<string>): Algebra.FilterNode {
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

    private rewriteInverseExpression (triple: Algebra.PathTripleObject): Algebra.TripleObject|Algebra.PathTripleObject {
        return {
            subject: triple.object,
            predicate: triple.predicate.items[0],
            object: triple.subject
        } as Algebra.TripleObject|Algebra.PathTripleObject
    }

    private rewriteSequenceExpression (triple: Algebra.PathTripleObject): Array<Algebra.TripleObject|Algebra.PathTripleObject> {
        let triples = new Array<Algebra.TripleObject|Algebra.PathTripleObject>()
        let expression = triple.predicate.items[0]

        triples.push({
            subject: triple.subject,
            predicate: expression,
            object: `?tythorVar_${this._numVariable}`
        } as Algebra.TripleObject|Algebra.PathTripleObject)

        for (let i = 1; i < triple.predicate.items.length - 1; i++) {
            expression = triple.predicate.items[i]
            triples.push({
                subject: `?tythorVar_${this._numVariable}`,
                predicate: expression,
                object: `?tythorVar_${++this._numVariable}`
            } as Algebra.TripleObject|Algebra.PathTripleObject)
        }

        expression = triple.predicate.items[triple.predicate.items.length - 1]

        triples.push({
            subject: `?tythorVar_${this._numVariable++}`,
            predicate: expression,
            object: triple.object
        } as Algebra.TripleObject|Algebra.PathTripleObject)
        return triples
    }

    private rewriteAlternativeExpression (triple: Algebra.PathTripleObject): Array<Algebra.TripleObject|Algebra.PathTripleObject> {
        return triple.predicate.items.map((expression: string|Algebra.PropertyPath) => {
            return {
                subject: triple.subject,
                predicate: expression,
                object: triple.object
            } as Algebra.TripleObject | Algebra.PathTripleObject
        })
    }
}