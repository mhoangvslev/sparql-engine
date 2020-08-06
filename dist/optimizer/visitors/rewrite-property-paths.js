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
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var plan_visitor_1 = require("../plan-visitor");
var lodash_1 = require("lodash");
/**
 * Implements a simple Property Path rewriting: non-transitive expression are extracted and injected in the BGP
 * @author Julien AIMONIER-DAVAT
 */
var RewritePropertyPaths = /** @class */ (function (_super) {
    __extends(RewritePropertyPaths, _super);
    function RewritePropertyPaths() {
        var _this = _super.call(this) || this;
        _this._numVariable = 0;
        return _this;
    }
    /**
     * Visit and transform a Basic Graph Pattern node.
     * Non-transitive expressions of Property Path patterns are rewritten.
     * @param  node - Basic Graph Pattern node
     * @return The transformed Basic Graph Pattern node
     */
    RewritePropertyPaths.prototype.visitBGP = function (node) {
        var _a, _b, e_1, _c, _d, _e, _f, _g, _h, _j;
        var newNode = lodash_1.cloneDeep(node);
        for (var i = 0; i < node.triples.length; i++) {
            var triple = node.triples[i];
            if (this.isPathTriple(triple)) {
                switch (triple.predicate.pathType) {
                    case '/':
                        var sequenceNode = { triples: [], type: 'bgp' };
                        (_a = sequenceNode.triples).push.apply(_a, __spread(newNode.triples));
                        sequenceNode.triples.splice(i, 1);
                        (_b = sequenceNode.triples).push.apply(_b, __spread(this.rewriteSequenceExpression(triple)));
                        return this.visit(sequenceNode);
                    case '|':
                        var alternativeNode = { patterns: [], type: 'union' };
                        try {
                            for (var _k = (e_1 = void 0, __values(this.rewriteAlternativeExpression(triple))), _l = _k.next(); !_l.done; _l = _k.next()) {
                                var alternativeClause = _l.value;
                                var clauseNode = { triples: [], type: 'bgp' };
                                (_d = clauseNode.triples).push.apply(_d, __spread(newNode.triples));
                                clauseNode.triples.splice(i, 1);
                                clauseNode.triples.push(alternativeClause);
                                alternativeNode.patterns.push(clauseNode);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return this.visit(alternativeNode);
                    case '^':
                        var inverseNode = { triples: [], type: 'bgp' };
                        (_e = inverseNode.triples).push.apply(_e, __spread(newNode.triples));
                        inverseNode.triples.splice(i, 1);
                        inverseNode.triples.push(this.rewriteInverseExpression(triple));
                        return this.visit(inverseNode);
                    case '!':
                        var _m = __read(this.extractNegatedPredicates(triple.predicate), 2), forward = _m[0], backward = _m[1];
                        if (forward.length > 0 && backward.length === 0) {
                            var forwardGroup = { patterns: [], type: 'group' };
                            var forwardBGP = { triples: [], type: 'bgp' };
                            (_f = forwardBGP.triples).push.apply(_f, __spread(newNode.triples));
                            forwardBGP.triples.splice(i, 1);
                            forwardBGP.triples.push({
                                subject: triple.subject,
                                predicate: "?tythorVar_" + this._numVariable,
                                object: triple.object
                            });
                            forwardGroup.patterns.push(forwardBGP, this.buildFilter("?tythorVar_" + this._numVariable++, forward));
                            return this.visit(forwardGroup);
                        }
                        else if (forward.length === 0 && backward.length > 0) {
                            var backwardGroup = { patterns: [], type: 'group' };
                            var backwardBGP = { triples: [], type: 'bgp' };
                            (_g = backwardBGP.triples).push.apply(_g, __spread(newNode.triples));
                            backwardBGP.triples.splice(i, 1);
                            backwardBGP.triples.push({
                                subject: triple.object,
                                predicate: "?tythorVar_" + this._numVariable,
                                object: triple.subject
                            });
                            backwardGroup.patterns.push(backwardBGP, this.buildFilter("?tythorVar_" + this._numVariable++, backward));
                            return this.visit(backwardGroup);
                        }
                        else if (forward.length > 0 && backward.length > 0) {
                            var negationUnion = { patterns: [], type: 'union' };
                            var forwardGroup = { patterns: [], type: 'group' };
                            var backwardGroup = { patterns: [], type: 'group' };
                            var forwardBGP = { triples: [], type: 'bgp' };
                            var backwardBGP = { triples: [], type: 'bgp' };
                            (_h = forwardBGP.triples).push.apply(_h, __spread(newNode.triples));
                            forwardBGP.triples.splice(i, 1);
                            forwardBGP.triples.push({
                                subject: triple.subject,
                                predicate: "?tythorVar_" + this._numVariable,
                                object: triple.object
                            });
                            forwardGroup.patterns.push(forwardBGP, this.buildFilter("?tythorVar_" + this._numVariable++, forward));
                            (_j = backwardBGP.triples).push.apply(_j, __spread(newNode.triples));
                            backwardBGP.triples.splice(i, 1);
                            backwardBGP.triples.push({
                                subject: triple.object,
                                predicate: "?tythorVar_" + this._numVariable,
                                object: triple.subject
                            });
                            backwardGroup.patterns.push(backwardBGP, this.buildFilter("?tythorVar_" + this._numVariable++, backward));
                            negationUnion.patterns.push(forwardGroup, backwardGroup);
                            return this.visit(negationUnion);
                        }
                        return newNode;
                    case '*':
                    case '+':
                    case '?':
                    default:
                        break;
                }
            }
        }
        return newNode;
    };
    RewritePropertyPaths.prototype.isPathTriple = function (triple) {
        return typeof triple.predicate !== 'string';
    };
    RewritePropertyPaths.prototype.extractNegatedPredicates = function (expression) {
        var e_2, _a;
        var forward = [];
        var backward = [];
        if (typeof expression === 'string') {
            forward.push(expression);
        }
        else if (expression.pathType === '^' && typeof expression.items[0] === 'string') {
            backward.push(expression.items[0]);
        }
        else if (expression.pathType === '|') {
            try {
                for (var _b = __values(expression.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var subexpression = _c.value;
                    if (typeof subexpression === 'string') {
                        forward.push(subexpression);
                    }
                    else if (subexpression.pathType === '^' && typeof subexpression.items[0] === 'string') {
                        backward.push(subexpression.items[0]);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        return [forward, backward];
    };
    RewritePropertyPaths.prototype.buildFilter = function (variable, predicates) {
        var node = {
            type: 'filter',
            expression: {
                type: 'operation',
                operator: '!=',
                args: [variable, predicates[0]]
            }
        };
        for (var i = 1; i < predicates.length; i++) {
            var expression = {
                type: 'operation',
                operator: '&&',
                args: [node.expression, {
                        type: 'operation',
                        operator: '!=',
                        args: [variable, predicates[i]]
                    }]
            };
            node.expression = expression;
        }
        return node;
    };
    RewritePropertyPaths.prototype.rewriteInverseExpression = function (triple) {
        return {
            subject: triple.object,
            predicate: triple.predicate.items[0],
            object: triple.subject
        };
    };
    RewritePropertyPaths.prototype.rewriteSequenceExpression = function (triple) {
        var triples = new Array();
        var expression = triple.predicate.items[0];
        triples.push({
            subject: triple.subject,
            predicate: expression,
            object: "?tythorVar_" + this._numVariable
        });
        for (var i = 1; i < triple.predicate.items.length - 1; i++) {
            expression = triple.predicate.items[i];
            triples.push({
                subject: "?tythorVar_" + this._numVariable,
                predicate: expression,
                object: "?tythorVar_" + ++this._numVariable
            });
        }
        expression = triple.predicate.items[triple.predicate.items.length - 1];
        triples.push({
            subject: "?tythorVar_" + this._numVariable++,
            predicate: expression,
            object: triple.object
        });
        return triples;
    };
    RewritePropertyPaths.prototype.rewriteAlternativeExpression = function (triple) {
        return triple.predicate.items.map(function (expression) {
            return {
                subject: triple.subject,
                predicate: expression,
                object: triple.object
            };
        });
    };
    return RewritePropertyPaths;
}(plan_visitor_1.default));
exports.default = RewritePropertyPaths;
