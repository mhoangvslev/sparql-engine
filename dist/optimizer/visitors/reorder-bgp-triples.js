"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var plan_visitor_1 = require("../plan-visitor");
var api_1 = require("../../api");
var lodash_1 = require("lodash");
var ReorderRules = /** @class */ (function () {
    function ReorderRules() {
    }
    ReorderRules.TERM = 1;
    ReorderRules.VAR = 2;
    ReorderRules.PATH = 4;
    ReorderRules.MAX_WEIGHT = 100;
    ReorderRules.patterns = [
        { subject: ReorderRules.TERM, predicate: ReorderRules.TERM, object: ReorderRules.TERM, weigth: 1 },
        { subject: ReorderRules.TERM, predicate: ReorderRules.TERM, object: ReorderRules.VAR, weigth: 15 },
        { subject: ReorderRules.TERM, predicate: ReorderRules.VAR, object: ReorderRules.TERM, weigth: 20 },
        { subject: ReorderRules.VAR, predicate: ReorderRules.TERM, object: ReorderRules.TERM, weigth: 25 },
        { subject: ReorderRules.TERM, predicate: ReorderRules.VAR, object: ReorderRules.VAR, weigth: 30 },
        { subject: ReorderRules.VAR, predicate: ReorderRules.VAR, object: ReorderRules.TERM, weigth: 35 },
        { subject: ReorderRules.VAR, predicate: ReorderRules.TERM, object: ReorderRules.VAR, weigth: 40 },
        { subject: ReorderRules.VAR, predicate: ReorderRules.VAR, object: ReorderRules.VAR, weigth: 90 },
        { subject: ReorderRules.TERM, predicate: ReorderRules.PATH, object: ReorderRules.TERM, weigth: 2 },
        { subject: ReorderRules.TERM, predicate: ReorderRules.PATH, object: ReorderRules.VAR, weigth: 8 },
        { subject: ReorderRules.VAR, predicate: ReorderRules.PATH, object: ReorderRules.TERM, weigth: 10 },
        { subject: ReorderRules.VAR, predicate: ReorderRules.PATH, object: ReorderRules.VAR, weigth: 100 }
    ];
    return ReorderRules;
}());
/**
 * Implements a static join ordering algorithm based on counting-variable algorithm
 * @author Julien AIMONIER-DAVAT
 */
var ReorderBasicGraphPatternTriples = /** @class */ (function (_super) {
    __extends(ReorderBasicGraphPatternTriples, _super);
    function ReorderBasicGraphPatternTriples() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ReorderBasicGraphPatternTriples.prototype.getWeight = function (triple, boundVariables) {
        var e_1, _a;
        var subject = ReorderRules.VAR;
        var predicate = ReorderRules.VAR;
        var object = ReorderRules.VAR;
        if (!api_1.rdf.isVariable(triple.subject)) {
            subject = ReorderRules.TERM;
        }
        if (typeof triple.predicate === 'string' && !api_1.rdf.isVariable(triple.predicate)) {
            predicate = ReorderRules.TERM;
        }
        else {
            predicate = ReorderRules.PATH;
        }
        if (!api_1.rdf.isVariable(triple.object)) {
            object = ReorderRules.TERM;
        }
        try {
            for (var _b = __values(ReorderRules.patterns), _c = _b.next(); !_c.done; _c = _b.next()) {
                var pattern = _c.value;
                if (pattern.subject === subject && pattern.predicate === predicate && pattern.object === object) {
                    if (typeof triple.predicate !== 'string' && ['*', '+'].includes(triple.predicate.pathType)) {
                        return pattern.weigth + 1;
                    }
                    return pattern.weigth;
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
        return ReorderRules.MAX_WEIGHT;
    };
    ReorderBasicGraphPatternTriples.prototype.selectMinWeightedTriple = function (triples, boundVariables) {
        var minWeight = this.getWeight(triples[0], boundVariables);
        var tripleIndex = 0;
        for (var i = 1, len = triples.length; i < len; i++) {
            var weigth = this.getWeight(triples[i], boundVariables);
            if (minWeight > weigth) {
                minWeight = weigth;
                tripleIndex = i;
            }
        }
        return triples.splice(tripleIndex, 1)[0];
    };
    ReorderBasicGraphPatternTriples.prototype.selectMinWeightedJoinTriple = function (triples, boundVariables) {
        var joinTriples = triples.filter(function (triple) {
            if (boundVariables.includes(triple.subject) || boundVariables.includes(triple.object)) {
                return true;
            }
            else if (typeof triple.predicate === 'string') {
                return boundVariables.includes(triple.predicate);
            }
            else {
                return false;
            }
        });
        if (joinTriples.length === 0) {
            return undefined;
        }
        var selectedTriple = this.selectMinWeightedTriple(joinTriples, boundVariables);
        for (var i = 0; i < triples.length; i++) {
            if (lodash_1.isEqual(triples[i], selectedTriple)) {
                return triples.splice(i, 1)[0];
            }
        }
        throw new Error('Something went wrong during join ordering...');
    };
    ReorderBasicGraphPatternTriples.prototype.updateBoundVariable = function (triple, boundVariables) {
        if (api_1.rdf.isVariable(triple.subject) && !boundVariables.includes(triple.subject)) {
            boundVariables.push(triple.subject);
        }
        if (typeof triple.predicate === 'string' && api_1.rdf.isVariable(triple.predicate) && !boundVariables.includes(triple.predicate)) {
            boundVariables.push(triple.predicate);
        }
        if (api_1.rdf.isVariable(triple.object) && !boundVariables.includes(triple.object)) {
            boundVariables.push(triple.object);
        }
    };
    ReorderBasicGraphPatternTriples.prototype.reorder = function (triples) {
        var nonOrderedTriples = lodash_1.cloneDeep(triples);
        var orderedTriples = new Array();
        var boundVariables = new Array();
        while (nonOrderedTriples.length > 0) {
            var joinTriple = this.selectMinWeightedJoinTriple(nonOrderedTriples, boundVariables);
            if (joinTriple === undefined) {
                var triple = this.selectMinWeightedTriple(nonOrderedTriples, boundVariables);
                this.updateBoundVariable(triple, boundVariables);
                orderedTriples.push(triple);
            }
            else {
                this.updateBoundVariable(joinTriple, boundVariables);
                orderedTriples.push(joinTriple);
            }
        }
        return orderedTriples;
    };
    /**
     * Visit and transform a Basic Graph Pattern node.
     * Use static join ordering algorithm to reorder BGP triple patterns
     * @param  node - Basic Graph Pattern node
     * @return The transformed Basic Graph Pattern node
     */
    ReorderBasicGraphPatternTriples.prototype.visitBGP = function (node) {
        var e_2, _a;
        var orderedTriples = this.reorder(node.triples);
        var newNode = {
            type: 'group',
            patterns: []
        };
        var basicTriple = typeof orderedTriples[0].predicate === 'string';
        var bgp = {
            type: 'bgp',
            triples: []
        };
        try {
            for (var orderedTriples_1 = __values(orderedTriples), orderedTriples_1_1 = orderedTriples_1.next(); !orderedTriples_1_1.done; orderedTriples_1_1 = orderedTriples_1.next()) {
                var triple = orderedTriples_1_1.value;
                if (basicTriple && typeof triple.predicate === 'string') {
                    bgp.triples.push(triple);
                }
                else if (!basicTriple && typeof triple.predicate !== 'string') {
                    bgp.triples.push(triple);
                }
                else {
                    newNode.patterns.push(bgp);
                    basicTriple = !basicTriple;
                    bgp = { type: 'bgp', triples: [triple] };
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (orderedTriples_1_1 && !orderedTriples_1_1.done && (_a = orderedTriples_1.return)) _a.call(orderedTriples_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (bgp.triples.length > 0) {
            newNode.patterns.push(bgp);
        }
        return newNode;
    };
    return ReorderBasicGraphPatternTriples;
}(plan_visitor_1.default));
exports.default = ReorderBasicGraphPatternTriples;
