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
exports.PathsCompressionOptimizer = void 0;
var automaton_1 = require("../automaton-model/automaton");
var sequence_transition_1 = require("../automaton-model/sequence-transition");
var lodash_1 = require("lodash");
/**
 * @author Julien Aimonier-Davat
 */
var PathsCompressionOptimizer = /** @class */ (function () {
    function PathsCompressionOptimizer() {
    }
    PathsCompressionOptimizer.prototype.hasSelfTransition = function (automaton, state) {
        var e_1, _a;
        try {
            for (var _b = __values(automaton.findTransitionsFrom(state)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var transition = _c.value;
                if (transition.from.name === transition.to.name) {
                    return true;
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
        return false;
    };
    PathsCompressionOptimizer.prototype.buildPathsFrom = function (automaton, state) {
        var e_2, _a, e_3, _b;
        var paths = new Array();
        var stack = new Array();
        try {
            for (var _c = __values(automaton.findTransitionsFrom(state)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var transition = _d.value;
                var multiPredicateTransition = new sequence_transition_1.SequenceTransition(transition.from, transition.to);
                multiPredicateTransition.instructions.push(transition.instruction);
                stack.push(multiPredicateTransition);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
        while (stack.length > 0) {
            var transition = stack.pop();
            if (transition.to.isFinal || this.hasSelfTransition(automaton, transition.to)) {
                paths.push(transition);
            }
            else {
                try {
                    for (var _e = (e_3 = void 0, __values(automaton.findTransitionsFrom(transition.to))), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var nextTransition = _f.value;
                        var multiPredicateTransition = new sequence_transition_1.SequenceTransition(nextTransition.from, nextTransition.to);
                        multiPredicateTransition.instructions.push(nextTransition.instruction);
                        var newTransition = lodash_1.cloneDeep(transition);
                        newTransition.merge(multiPredicateTransition);
                        stack.push(newTransition);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
        }
        return paths;
    };
    PathsCompressionOptimizer.prototype.buildPaths = function (automaton) {
        var e_4, _a;
        var paths = new Array();
        var visited = new Set();
        var stack = new Array();
        var initialState = automaton.findInitialStates()[0];
        stack.push(initialState);
        visited.add(initialState.name);
        while (stack.length > 0) {
            var currentState = stack.pop();
            var pathsFromCurrentState = this.buildPathsFrom(automaton, currentState);
            paths.push.apply(paths, __spread(pathsFromCurrentState));
            try {
                for (var pathsFromCurrentState_1 = (e_4 = void 0, __values(pathsFromCurrentState)), pathsFromCurrentState_1_1 = pathsFromCurrentState_1.next(); !pathsFromCurrentState_1_1.done; pathsFromCurrentState_1_1 = pathsFromCurrentState_1.next()) {
                    var path = pathsFromCurrentState_1_1.value;
                    if (!visited.has(path.to.name)) {
                        stack.push(path.to);
                        visited.add(path.to.name);
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (pathsFromCurrentState_1_1 && !pathsFromCurrentState_1_1.done && (_a = pathsFromCurrentState_1.return)) _a.call(pathsFromCurrentState_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        return paths;
    };
    PathsCompressionOptimizer.prototype.optimize = function (automaton) {
        var e_5, _a;
        var paths = this.buildPaths(automaton);
        var optimizedAutomaton = new automaton_1.Automaton();
        try {
            for (var paths_1 = __values(paths), paths_1_1 = paths_1.next(); !paths_1_1.done; paths_1_1 = paths_1.next()) {
                var path = paths_1_1.value;
                if (!optimizedAutomaton.findState(path.from.name)) {
                    optimizedAutomaton.addState(path.from);
                }
                if (!optimizedAutomaton.findState(path.to.name)) {
                    optimizedAutomaton.addState(path.to);
                }
                optimizedAutomaton.addTransition(path);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (paths_1_1 && !paths_1_1.done && (_a = paths_1.return)) _a.call(paths_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return optimizedAutomaton;
    };
    return PathsCompressionOptimizer;
}());
exports.PathsCompressionOptimizer = PathsCompressionOptimizer;
