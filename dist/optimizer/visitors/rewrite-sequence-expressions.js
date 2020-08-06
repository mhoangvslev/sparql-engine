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
Object.defineProperty(exports, "__esModule", { value: true });
var plan_visitor_1 = require("../plan-visitor");
var lodash_1 = require("lodash");
/**
 * Implements a simple Property Path rewriting: non-transitive expression are extracted and injected in the BGP
 * @author Julien AIMONIER-DAVAT
 */
var RewriteSequenceExpressions = /** @class */ (function (_super) {
    __extends(RewriteSequenceExpressions, _super);
    function RewriteSequenceExpressions() {
        var _this = _super.call(this) || this;
        _this._numVariable = 0;
        return _this;
    }
    RewriteSequenceExpressions.prototype.rewriteSequence = function (triple) {
        var triples = new Array();
        if (triple.predicate.pathType !== '/') {
            return undefined;
        }
        var expression = triple.predicate.items[0];
        if (typeof expression === 'string') {
            triples.push({
                subject: triple.subject,
                predicate: expression,
                object: "?tythorVar_" + this._numVariable
            });
        }
        else if (expression.pathType === '^' && typeof expression.items[0] === 'string') {
            triples.push({
                subject: "?tythorVar_" + this._numVariable,
                predicate: expression.items[0],
                object: triple.subject
            });
        }
        else {
            return undefined;
        }
        for (var i = 0; i < triple.predicate.items.length; i++) {
            expression = triple.predicate.items[i];
            if (typeof expression === 'string') {
                triples.push({
                    subject: "?tythorVar_" + this._numVariable,
                    predicate: expression,
                    object: "?tythorVar_" + ++this._numVariable
                });
            }
            else if (expression.pathType === '^' && typeof expression.items[0] === 'string') {
                triples.push({
                    subject: "?tythorVar_" + ++this._numVariable,
                    predicate: expression.items[0],
                    object: "?tythorVar_" + this._numVariable
                });
            }
            else {
                return undefined;
            }
        }
        expression = triple.predicate.items[triple.predicate.items.length - 1];
        if (typeof expression === 'string') {
            triples.push({
                subject: "?tythorVar_" + this._numVariable++,
                predicate: expression,
                object: triple.object
            });
        }
        else if (expression.pathType === '^' && typeof expression.items[0] === 'string') {
            triples.push({
                subject: triple.object,
                predicate: expression.items[0],
                object: "?tythorVar_" + this._numVariable++
            });
        }
        else {
            return undefined;
        }
        return triples;
    };
    /**
     * Visit and transform a Basic Graph Pattern node.
     * Non-transitive expressions of Property Path patterns are rewritten.
     * @param  node - Basic Graph Pattern node
     * @return The transformed Basic Graph Pattern node
     */
    RewriteSequenceExpressions.prototype.visitBGP = function (node) {
        var e_1, _a;
        var newNode = lodash_1.cloneDeep(node);
        var triples = new Array();
        try {
            for (var _b = __values(node.triples), _c = _b.next(); !_c.done; _c = _b.next()) {
                var triple = _c.value;
                if (typeof triple.predicate === 'string') {
                    triples.push(triple);
                }
                else {
                    var rewritting = this.rewriteSequence(triple);
                    if (rewritting) {
                        triples.push.apply(triples, __spread(rewritting));
                    }
                    else {
                        triples.push(triple);
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        newNode.triples = triples;
        return newNode;
    };
    return RewriteSequenceExpressions;
}(plan_visitor_1.default));
exports.default = RewriteSequenceExpressions;
