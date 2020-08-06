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
exports.PropertyTransition = void 0;
var transition_1 = require("./transition");
var api_1 = require("../../../../api");
/**
 * @author Julien Aimonier-Davat
 */
var PropertyTransition = /** @class */ (function (_super) {
    __extends(PropertyTransition, _super);
    function PropertyTransition(from, to, instruction) {
        var _this = _super.call(this, from, to) || this;
        _this._instruction = instruction;
        return _this;
    }
    Object.defineProperty(PropertyTransition.prototype, "instruction", {
        get: function () {
            return this._instruction;
        },
        enumerable: false,
        configurable: true
    });
    PropertyTransition.prototype.instructions2sparql = function (subject, object, joinPrefix, filterPrefix) {
        if (joinPrefix === void 0) { joinPrefix = 'tythorJoin'; }
        if (filterPrefix === void 0) { filterPrefix = 'tythorFilter'; }
        var triples = new Array();
        var filters = new Array();
        triples.push({
            subject: this.instruction.inverse ? object : subject,
            predicate: this.instruction.negation ? "?" + filterPrefix + "_" + 0 : this.instruction.properties[0],
            object: this.instruction.inverse ? subject : object
        });
        if (this.instruction.negation) {
            filters.push(this.buildFilter("?" + filterPrefix + "_" + 0, this.instruction.properties));
        }
        return [triples, filters];
    };
    PropertyTransition.prototype.buildQuery = function (subject, object, joinPrefix, filterPrefix) {
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
    PropertyTransition.prototype.print = function (marginLeft) {
        console.log(" ".repeat(marginLeft) + "> Transition{\n            from: " + this.from.name + ", \n            to: " + this.to.name + ",\n            instruction: " + JSON.stringify(this._instruction) + "\n        }");
    };
    PropertyTransition.prototype.equals = function (other) {
        return _super.prototype.equals.call(this, other) && this.instruction.equals(other.instruction);
    };
    return PropertyTransition;
}(transition_1.Transition));
exports.PropertyTransition = PropertyTransition;
