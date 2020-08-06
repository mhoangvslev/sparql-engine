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
exports.AlternativeTransition = void 0;
var transition_1 = require("./transition");
var api_1 = require("../../../../api");
var sequence_transition_1 = require("./sequence-transition");
/**
 * @author Julien Aimonier-Davat
 */
var AlternativeTransition = /** @class */ (function (_super) {
    __extends(AlternativeTransition, _super);
    function AlternativeTransition(from, to) {
        var _this = _super.call(this, from, to) || this;
        _this._instructions = new Array();
        return _this;
    }
    Object.defineProperty(AlternativeTransition.prototype, "instructions", {
        get: function () {
            return this._instructions;
        },
        enumerable: false,
        configurable: true
    });
    AlternativeTransition.prototype.buildQuery = function (subject, object, joinPrefix, filterPrefix) {
        var _a;
        var _this = this;
        if (joinPrefix === void 0) { joinPrefix = 'tythorJoin'; }
        if (filterPrefix === void 0) { filterPrefix = 'tythorFilter'; }
        if (this.instructions.length === 1) {
            var transition = new sequence_transition_1.SequenceTransition(this.from, this.to);
            (_a = transition.instructions).push.apply(_a, __spread(this.instructions[0]));
            return transition.buildQuery(subject, object, joinPrefix, filterPrefix);
        }
        var query = {
            type: 'query',
            queryType: 'SELECT',
            prefixes: {},
            variables: [subject, object].filter(function (variable) { return api_1.rdf.isVariable(variable); }),
            where: []
        };
        var union = {
            type: 'union',
            patterns: this.instructions.map(function (path) {
                var _a;
                var transition = new sequence_transition_1.SequenceTransition(_this.from, _this.to);
                (_a = transition.instructions).push.apply(_a, __spread(path));
                return transition.buildQuery(subject, object, joinPrefix, filterPrefix).where[0];
            })
        };
        query.where = [union];
        return query;
    };
    AlternativeTransition.prototype.print = function (marginLeft) {
        console.log(" ".repeat(marginLeft) + "> Transition{\n            from: " + this.from.name + ", \n            to: " + this.to.name + ",\n            instructions: " + JSON.stringify(this._instructions) + "\n        }");
    };
    AlternativeTransition.prototype.equals = function (other) {
        if (!this.from.equals(other.from) || !this.to.equals(other.to)) {
            return false;
        }
        for (var i = 0; i < this.instructions.length; i++) {
            for (var j = 0; j < this.instructions[i].length; j++) {
                if (!this.instructions[i][j].equals(other.instructions[i][j])) {
                    return false;
                }
            }
        }
        return true;
    };
    return AlternativeTransition;
}(transition_1.Transition));
exports.AlternativeTransition = AlternativeTransition;
