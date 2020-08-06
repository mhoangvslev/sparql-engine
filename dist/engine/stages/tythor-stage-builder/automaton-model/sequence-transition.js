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
exports.SequenceTransition = void 0;
var transition_1 = require("./transition");
var api_1 = require("../../../../api");
/**
 * @author Julien Aimonier-Davat
 */
var SequenceTransition = /** @class */ (function (_super) {
    __extends(SequenceTransition, _super);
    function SequenceTransition(from, to) {
        var _this = _super.call(this, from, to) || this;
        _this._instructions = new Array();
        return _this;
    }
    Object.defineProperty(SequenceTransition.prototype, "instructions", {
        get: function () {
            return this._instructions;
        },
        enumerable: false,
        configurable: true
    });
    SequenceTransition.prototype.merge = function (transition) {
        var _a;
        if (!this.to.equals(transition.from)) {
            throw new Error("A transition to node " + this.to + " cannot be merged with a transition from node " + transition.from);
        }
        this.to = transition.to;
        (_a = this.instructions).push.apply(_a, __spread(transition.instructions));
    };
    SequenceTransition.prototype.instructions2sparql = function (subject, object, joinPrefix, filterPrefix) {
        if (joinPrefix === void 0) { joinPrefix = 'tythorJoin'; }
        if (filterPrefix === void 0) { filterPrefix = 'tythorFilter'; }
        var triples = new Array();
        var filters = new Array();
        var joinVar = 0;
        var filterVar = 0;
        for (var index = 0, len = this.instructions.length; index < len; index++) {
            var tripleSubject = (index === 0) ? subject : "?" + joinPrefix + "_" + joinVar;
            var tripleObject = (index === len - 1) ? object : "?" + joinPrefix + "_" + (joinVar + 1);
            var instruction = this.instructions[index];
            triples.push({
                subject: instruction.inverse ? tripleObject : tripleSubject,
                predicate: instruction.negation ? "?" + filterPrefix + "_" + filterVar : instruction.properties[0],
                object: instruction.inverse ? tripleSubject : tripleObject
            });
            if (instruction.negation) {
                filters.push(this.buildFilter("?" + filterPrefix + "_" + filterVar, instruction.properties));
            }
            joinVar++;
            filterVar++;
        }
        return [triples, filters];
    };
    SequenceTransition.prototype.buildQuery = function (subject, object, joinPrefix, filterPrefix) {
        if (joinPrefix === void 0) { joinPrefix = 'tythorJoin'; }
        if (filterPrefix === void 0) { filterPrefix = 'tythorFilter'; }
        var _a = __read(this.instructions2sparql(subject, object, joinPrefix, filterPrefix), 2), triples = _a[0], filters = _a[1];
        var bgp = {
            type: 'bgp',
            triples: triples
        };
        var group = {
            type: 'group',
            patterns: __spread([bgp], filters)
        };
        var query = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: {},
            variables: [subject, object].filter(function (variable) { return api_1.rdf.isVariable(variable); }),
            where: [group]
        };
        return query;
    };
    SequenceTransition.prototype.print = function (marginLeft) {
        console.log(" ".repeat(marginLeft) + "> Transition{\n            from: " + this.from.name + ", \n            to: " + this.to.name + ",\n            instructions: " + JSON.stringify(this._instructions) + "\n        }");
    };
    SequenceTransition.prototype.equals = function (other) {
        if (!this.from.equals(other.from) || !this.to.equals(other.to)) {
            return false;
        }
        if (this.instructions.length !== other.instructions.length) {
            return false;
        }
        for (var i = 0; i < this.instructions.length; i++) {
            if (!this.instructions[i].equals(other.instructions[i])) {
                return false;
            }
        }
        return true;
    };
    return SequenceTransition;
}(transition_1.Transition));
exports.SequenceTransition = SequenceTransition;
