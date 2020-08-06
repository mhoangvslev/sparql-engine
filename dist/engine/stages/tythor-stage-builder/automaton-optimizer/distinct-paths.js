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
exports.DistinctPathsOptimizer = void 0;
var automaton_1 = require("../automaton-model/automaton");
var sequence_transition_1 = require("../automaton-model/sequence-transition");
var lodash_1 = require("lodash");
/**
 * @author Julien Aimonier-Davat
 */
var DistinctPathsOptimizer = /** @class */ (function () {
    function DistinctPathsOptimizer() {
    }
    DistinctPathsOptimizer.prototype.optimize = function (automaton) {
        var e_1, _a, _b;
        var optimizedAutomaton = new automaton_1.Automaton();
        try {
            for (var _c = __values(automaton.states), _d = _c.next(); !_d.done; _d = _c.next()) {
                var state = _d.value;
                optimizedAutomaton.addState(lodash_1.cloneDeep(state));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        for (var i = 0; i < automaton.transitions.length; i++) {
            var duplicate = false;
            for (var j = 0; j < optimizedAutomaton.transitions.length && !duplicate; j++) {
                if (automaton.transitions[i].equals(optimizedAutomaton.transitions[j])) {
                    duplicate = true;
                }
            }
            if (!duplicate) {
                var transition = automaton.transitions[i];
                var from = optimizedAutomaton.findState(transition.from.name);
                var to = optimizedAutomaton.findState(transition.to.name);
                var instructions = lodash_1.cloneDeep(transition.instructions);
                var newTransition = new sequence_transition_1.SequenceTransition(from, to);
                (_b = newTransition.instructions).push.apply(_b, __spread(instructions));
                optimizedAutomaton.transitions.push(newTransition);
            }
        }
        return optimizedAutomaton;
    };
    return DistinctPathsOptimizer;
}());
exports.DistinctPathsOptimizer = DistinctPathsOptimizer;
