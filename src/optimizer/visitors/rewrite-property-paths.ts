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

    private extractNegatedProperties(expression: string|Algebra.PropertyPath): [Array<string>, Array<string>] {
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

    private propertiesFilter(variable: string, predicates: Array<string>): Algebra.FilterNode {
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

    private rewriteBgpWithPropertyPaths(triples: Array<Algebra.PathTripleObject|Algebra.TripleObject>, path_pattern: Algebra.PathTripleObject): Algebra.PlanNode {
        let path: Algebra.PropertyPath = path_pattern.predicate
        switch (path.pathType) {
            case '/':
                let rewrited_sequence: Algebra.BGPNode = {triples: [], type: 'bgp'} 
                let index = 0
                rewrited_sequence.triples.push({
                    subject: path_pattern.subject,
                    predicate: path.items[index],
                    object: `?tythorVar_${this._numVariable}`
                } as Algebra.TripleObject|Algebra.PathTripleObject)
                while (index < path.items.length - 2) {
                    rewrited_sequence.triples.push({
                        subject: `?tythorVar_${this._numVariable}`,
                        predicate: path.items[index + 1],
                        object: `?tythorVar_${++this._numVariable}`
                    } as Algebra.TripleObject|Algebra.PathTripleObject)
                    index++
                }
                rewrited_sequence.triples.push({
                    subject: `?tythorVar_${this._numVariable++}`,
                    predicate: path.items[index + 1],
                    object: path_pattern.object
                } as Algebra.TripleObject|Algebra.PathTripleObject)
                rewrited_sequence.triples.push(...triples)
                return this.visit(rewrited_sequence)
            case '|':
                let rewrited_alternative: Algebra.GroupNode = {patterns: [], type: 'union'}
                for (let expression of path.items) {
                    let alternative_clause: Algebra.BGPNode = {triples: [], type: 'bgp'}
                    alternative_clause.triples.push({
                        subject: path_pattern.subject,
                        predicate: expression,
                        object: path_pattern.object
                    } as Algebra.TripleObject|Algebra.PathTripleObject)
                    alternative_clause.triples.push(...triples)
                    rewrited_alternative.patterns.push(alternative_clause)
                }
                return this.visit(rewrited_alternative)
            case '^':
                let rewrited_inverse: Algebra.BGPNode = {triples: [], type: 'bgp'} 
                rewrited_inverse.triples.push({
                    subject: path_pattern.object,
                    predicate: path.items[0],
                    object: path_pattern.subject
                } as Algebra.TripleObject|Algebra.PathTripleObject)
                rewrited_inverse.triples.push(...triples)
                return this.visit(rewrited_inverse)
            case '!':
                let rewrited_negation: Algebra.GroupNode = {patterns: [], type: 'union'}
                let [forward_properties, backward_properties] = this.extractNegatedProperties(path.items[0])
                if (forward_properties.length > 0) {
                    let forward_group: Algebra.GroupNode = {patterns: [], type: 'group'}                   
                    let forward_bgp: Algebra.BGPNode = {triples: [], type: 'bgp'}
                    forward_bgp.triples.push({
                        subject: path_pattern.subject,
                        predicate: `?tythorVar_${this._numVariable}`,
                        object: path_pattern.object                 
                    })
                    forward_bgp.triples.push(...triples)
                    forward_group.patterns.push(forward_bgp)
                    forward_group.patterns.push(this.propertiesFilter(`?tythorVar_${this._numVariable++}`, forward_properties))
                    rewrited_negation.patterns.push(forward_group)
                }
                if (backward_properties.length > 0) {
                    let backward_group: Algebra.GroupNode = {patterns: [], type: 'group'}                   
                    let backward_bgp: Algebra.BGPNode = {triples: [], type: 'bgp'}
                    backward_bgp.triples.push({
                        subject: path_pattern.object,
                        predicate: `?tythorVar_${this._numVariable}`,
                        object: path_pattern.subject                 
                    })
                    backward_bgp.triples.push(...triples)
                    backward_group.patterns.push(backward_bgp)
                    backward_group.patterns.push(this.propertiesFilter(`?tythorVar_${this._numVariable++}`, forward_properties))
                    rewrited_negation.patterns.push(backward_group)
                }
                if (rewrited_negation.patterns.length === 2) {
                    return this.visit(rewrited_negation)
                } else {
                    return this.visit(rewrited_negation.patterns[0])
                }
            default:
                throw new Error(`Unknown path type: ${path.pathType}`)
        }
    }

    private must_be_decomposed(triple: Algebra.TripleObject | Algebra.PathTripleObject): triple is Algebra.PathTripleObject {
        return (typeof triple.predicate !== "string") && !(['+', '*', '?'].includes(triple.predicate.pathType))
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
            if (this.must_be_decomposed(triple)) {
                newNode.triples.splice(i, 1)
                return this.rewriteBgpWithPropertyPaths(newNode.triples, triple)
            }
        }
        return newNode
    }
}