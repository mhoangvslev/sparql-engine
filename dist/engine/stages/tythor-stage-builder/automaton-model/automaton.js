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
exports.Automaton = void 0;
/**
 * @author Julien Aimonier-Davat
 */
var Automaton = /** @class */ (function () {
    function Automaton() {
        this._states = new Array();
        this._transitions = new Array();
    }
    Object.defineProperty(Automaton.prototype, "states", {
        get: function () {
            return this._states;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Automaton.prototype, "transitions", {
        get: function () {
            return this._transitions;
        },
        enumerable: false,
        configurable: true
    });
    Automaton.prototype.addState = function (state) {
        this.states.push(state);
    };
    Automaton.prototype.findState = function (name) {
        return this.states.find(function (state) {
            return state.name === name;
        });
    };
    Automaton.prototype.findInitialStates = function () {
        return this.states.filter(function (state) {
            return state.isInitial;
        });
    };
    Automaton.prototype.findTransitionsFrom = function (from) {
        return this.transitions.filter(function (transition) {
            return transition.from.equals(from);
        });
    };
    Automaton.prototype.findTransition = function (from, to) {
        return this.transitions.find(function (transition) {
            return transition.from.equals(from) && transition.to.equals(to);
        });
    };
    Automaton.prototype.addTransition = function (transition) {
        this.transitions.push(transition);
    };
    Automaton.prototype.print = function (marginLeft) {
        var e_1, _a, e_2, _b;
        if (marginLeft === void 0) { marginLeft = 0; }
        console.log(" ".repeat(marginLeft) + ">>> STATES :");
        try {
            for (var _c = __values(this._states), _d = _c.next(); !_d.done; _d = _c.next()) {
                var state = _d.value;
                state.print(marginLeft);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        console.log(" ".repeat(marginLeft) + ">>> TRANSITIONS :");
        try {
            for (var _e = __values(this._transitions), _f = _e.next(); !_f.done; _f = _e.next()) {
                var transition = _f.value;
                transition.print(marginLeft);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    Automaton.prototype.equals = function (other) {
        var _this = this;
        var sameStates = other.states.every(function (otherState) {
            return _this.states.some(function (state) {
                return otherState.equals(state);
            });
        });
        var sameTransitions = other.transitions.every(function (otherTransition) {
            return _this.transitions.some(function (transition) {
                return otherTransition.equals(transition);
            });
        });
        return sameStates && sameTransitions;
    };
    return Automaton;
}());
exports.Automaton = Automaton;
