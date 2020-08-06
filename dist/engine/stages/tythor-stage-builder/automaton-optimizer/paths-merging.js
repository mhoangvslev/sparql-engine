"use strict";
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
exports.PathsMergingOptimizer = void 0;
var automaton_1 = require("../automaton-model/automaton");
var alternative_transition_1 = require("../automaton-model/alternative-transition");
var lodash_1 = require("lodash");
/**
 * @author Julien Aimonier-Davat
 */
var PathsMergingOptimizer = /** @class */ (function () {
    function PathsMergingOptimizer() {
    }
    PathsMergingOptimizer.prototype.optimize = function (automaton) {
        var e_1, _a;
        var optimizedAutomaton = new automaton_1.Automaton();
        try {
            for (var _b = __values(automaton.states), _c = _b.next(); !_c.done; _c = _b.next()) {
                var state = _c.value;
                optimizedAutomaton.addState(lodash_1.cloneDeep(state));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var visited = new Array();
        for (var i = 0; i < automaton.transitions.length; i++) {
            if (!visited.includes(i)) {
                visited.push(i);
                var t1 = automaton.transitions[i];
                var from = optimizedAutomaton.findState(t1.from.name);
                var to = optimizedAutomaton.findState(t1.to.name);
                var transition = new alternative_transition_1.AlternativeTransition(from, to);
                transition.instructions.push(lodash_1.cloneDeep(t1.instructions));
                for (var j = 0; j < automaton.transitions.length; j++) {
                    var t2 = automaton.transitions[j];
                    if (!visited.includes(j) && t2.from.name === t1.from.name && t2.to.name === t1.to.name) {
                        visited.push(j);
                        transition.instructions.push(lodash_1.cloneDeep(t2.instructions));
                    }
                }
                optimizedAutomaton.transitions.push(transition);
            }
        }
        return optimizedAutomaton;
    };
    return PathsMergingOptimizer;
}());
exports.PathsMergingOptimizer = PathsMergingOptimizer;
