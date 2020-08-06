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
exports.StatesMergingOptimizer = void 0;
var automaton_1 = require("../automaton-model/automaton");
var state_1 = require("../automaton-model/state");
var sequence_transition_1 = require("../automaton-model/sequence-transition");
var lodash_1 = require("lodash");
/**
 * @author Julien Aimonier-Davat
 */
var StatesMergingOptimizer = /** @class */ (function () {
    function StatesMergingOptimizer() {
    }
    StatesMergingOptimizer.prototype.compareInstructions = function (left, right) {
        if (left.length !== right.length) {
            return false;
        }
        for (var i = 0; i < left.length; i++) {
            if (!left[i].equals(right[i])) {
                return false;
            }
        }
        return true;
    };
    StatesMergingOptimizer.prototype.compareTransitions = function (left, right) {
        return left.to.name === right.to.name && this.compareInstructions(left.instructions, right.instructions);
    };
    StatesMergingOptimizer.prototype.compareStates = function (automaton, left, right) {
        var e_1, _a, e_2, _b;
        if (left.isInitial !== right.isInitial || left.isFinal !== right.isFinal) {
            return false;
        }
        try {
            for (var _c = __values(automaton.findTransitionsFrom(left)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var leftTransition = _d.value;
                var existsEquivalentRightTransition = false;
                try {
                    for (var _e = (e_2 = void 0, __values(automaton.findTransitionsFrom(right))), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var rightTransition = _f.value;
                        if (this.compareTransitions(leftTransition, rightTransition)) {
                            existsEquivalentRightTransition = true;
                            break;
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                if (!existsEquivalentRightTransition) {
                    return false;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return true;
    };
    StatesMergingOptimizer.prototype.computeEquivalencies = function (automaton, equivalencies) {
        var e_3, _a, e_4, _b;
        var update = false;
        do {
            update = false;
            try {
                for (var _c = (e_3 = void 0, __values(automaton.states)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var state1 = _d.value;
                    try {
                        for (var _e = (e_4 = void 0, __values(automaton.states)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var state2 = _f.value;
                            if (equivalencies.get(state1.name).includes(state2.name)) {
                                continue;
                            }
                            if (this.compareStates(automaton, state1, state2)) {
                                equivalencies.get(state1.name).push(state2.name);
                                equivalencies.get(state2.name).push(state1.name);
                                update = true;
                            }
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_3) throw e_3.error; }
            }
        } while (update);
    };
    StatesMergingOptimizer.prototype.optimize = function (automaton) {
        var e_5, _a, e_6, _b, e_7, _c, e_8, _d, e_9, _e, _f;
        var optimizedAutomaton = new automaton_1.Automaton();
        var equivalencies = new Map();
        try {
            for (var _g = __values(automaton.states), _h = _g.next(); !_h.done; _h = _g.next()) {
                var state = _h.value;
                equivalencies.set(state.name, new Array());
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
            }
            finally { if (e_5) throw e_5.error; }
        }
        this.computeEquivalencies(automaton, equivalencies);
        var agents = new Map();
        var state2agent = new Map();
        var agent = 0;
        try {
            for (var _j = __values(equivalencies.keys()), _k = _j.next(); !_k.done; _k = _j.next()) {
                var state = _k.value;
                if (state2agent.get(state) === undefined) {
                    state2agent.set(state, agent);
                    try {
                        for (var _l = (e_7 = void 0, __values(equivalencies.get(state))), _m = _l.next(); !_m.done; _m = _l.next()) {
                            var equivalentState = _m.value;
                            state2agent.set(equivalentState, agent);
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (_m && !_m.done && (_c = _l.return)) _c.call(_l);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                    var agentSate = new state_1.State(agent, automaton.findState(state).isInitial, automaton.findState(state).isFinal);
                    agents.set(agent, agentSate);
                    agent++;
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
            }
            finally { if (e_6) throw e_6.error; }
        }
        try {
            for (var _o = __values(agents.values()), _p = _o.next(); !_p.done; _p = _o.next()) {
                var state = _p.value;
                optimizedAutomaton.addState(state);
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_p && !_p.done && (_d = _o.return)) _d.call(_o);
            }
            finally { if (e_8) throw e_8.error; }
        }
        try {
            for (var _q = __values(automaton.transitions), _r = _q.next(); !_r.done; _r = _q.next()) {
                var transition = _r.value;
                var from = agents.get(state2agent.get(transition.from.name));
                var to = agents.get(state2agent.get(transition.to.name));
                var instructions = lodash_1.cloneDeep(transition.instructions);
                var newTransition = new sequence_transition_1.SequenceTransition(from, to);
                (_f = newTransition.instructions).push.apply(_f, __spread(instructions));
                optimizedAutomaton.addTransition(newTransition);
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_r && !_r.done && (_e = _q.return)) _e.call(_q);
            }
            finally { if (e_9) throw e_9.error; }
        }
        return optimizedAutomaton;
    };
    return StatesMergingOptimizer;
}());
exports.StatesMergingOptimizer = StatesMergingOptimizer;
