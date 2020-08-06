"use strict";
/* file : automaton.ts
MIT License

Copyright (c) 2019 Thomas Minier

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
exports.Automaton = exports.Transition = exports.State = void 0;
/**
 * A state of the automaton
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
var State = /** @class */ (function () {
    /**
     * Constructor
     * @param name - Name of the State. Must be unique.
     * @param isInitial - True to construct an initial State, False otherwise
     * @param isFinal - True to construct a final State, False otherwise
     */
    function State(name, isInitial, isFinal) {
        this._name = name;
        this._isInitial = isInitial;
        this._isFinal = isFinal;
    }
    Object.defineProperty(State.prototype, "name", {
        /**
         * Get the name of the State
         * @return The name of the State
         */
        get: function () {
            return this._name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(State.prototype, "isInitial", {
        /**
         * Get the flag that indicates whether the state is an initial state
         * @return True if the State is an initial State, False otherwise
         */
        get: function () {
            return this._isInitial;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(State.prototype, "isFinal", {
        /**
         * Get the flag that indicates whether the state is a final state
         * @return True if the State is a final State, False otherwise
         */
        get: function () {
            return this._isFinal;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Test if a name is equal to the name of the State
     * @param name - Name tested
     * @return True if the given name is equal to the name of the State, False otherwise
     */
    State.prototype.hasName = function (name) {
        return this.name === name;
    };
    /**
     * Test if a State is equal to this State
     * i.e. All the fields of the State are equal to those of this State
     * @param state - State tested
     * @return True if the States are equal, False otherwise
     */
    State.prototype.equals = function (state) {
        return this.name === state.name
            && this._isInitial == state._isInitial
            && this._isFinal == state.isFinal;
    };
    State.prototype.toString = function () {
        return "State = {name: $ {this.name}, isFinal: $ {this.isFinal}}";
    };
    return State;
}());
exports.State = State;
/**
 * A transition of the automaton
 */
var Transition = /** @class */ (function () {
    /**
     * Constructor
     * @param from - State from which the transition starts
     * @param to - State to which the transition arrives
     * @param reverse - True if to go throught this transiton, we have to look for an incoming edge in the RDF graph,
     *                  False if to go throught this transition, we have to look for an outgoing edge in the RDF graph
     * @param negation - True if to go throught this transition, we have to look for an edge for which the label must be in the predicates array,
     *                   False if to go throught this transition, we have to look for an edge for which the label musn't be in the predicates array
     * @param predicates
     */
    function Transition(from, to, reverse, negation, predicates) {
        this._from = from;
        this._to = to;
        this._reverse = reverse;
        this._negation = negation;
        this._predicates = predicates;
    }
    Object.defineProperty(Transition.prototype, "from", {
        /**
         * Get the State from which the transition starts
         * @return The State from which the transition starts
         */
        get: function () {
            return this._from;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Transition.prototype, "to", {
        /**
         * Get the State to which the transition arrives
         * @return The State to which the transition arrives
         */
        get: function () {
            return this._to;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Transition.prototype, "predicates", {
        /**
         * Get the predicates
         * @return if negation == False then an array of length 1, else an array of length 1 or more
         */
        get: function () {
            return this._predicates;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Transition.prototype, "reverse", {
        /**
         * Get the flag which indicates whether we have to look for an outgoing or an incoming edge in the RDF graph
         * @return The flag which indicates whether we have to look for an outgoing or an incoming edge in the RDF graph
         */
        get: function () {
            return this._reverse;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Transition.prototype, "negation", {
        /**
         * Get the flag which indicates whether the edge's label must or musn't be in the predicates array
         * @return The flag which indicates whether the edge's label must or musn't be in the predicates array
         */
        get: function () {
            return this._negation;
        },
        enumerable: false,
        configurable: true
    });
    Transition.prototype.hasPredicate = function (predicate) {
        return this.predicates.indexOf(predicate) > -1;
    };
    /**
     * Test if a Transition is equal to this Transition
     * i.e. All the fields of the Transition are equal to those of this Transition
     * @param transition - Transition tested
     * @return True if the Transitions are equal, False otherwise
     */
    Transition.prototype.equals = function (transition) {
        return this.from == transition.from
            && this.to == transition.to
            && this.reverse == transition.reverse
            && this.negation == transition.negation
            && this.predicates == transition.predicates;
    };
    Transition.prototype.toString = function () {
        var result = "Transition = {\n\t\n            from: $ {this.from.toString()},\n\t\n            to: $ {this.to.toString()},\n\t\n            reverse: $ {this.reverse},\n\t\n            negation: $ {this.negation},\n\t";
        var self = this;
        this.predicates.forEach(function (pred, index) {
            if (index == 0) {
                result += ",\n\t\tpredicates: [\n";
            }
            if (index < self.predicates.length - 1) {
                result += "\t\t\t$ {pred},\n";
            }
            else {
                result += "\t\t\t$ {pred}\n\t\t]";
            }
        });
        result += "\n\t}";
        return result;
    };
    return Transition;
}());
exports.Transition = Transition;
/**
 * An Automaton is used to evaluate a SPARQL Property Path. SPARQL Property Paths are transformed into an
 * equivalent Automaton which are used as a guide to navigate throught the Graph. When we reach a final state
 * then we have found a Path in the Graph that matches the Property Path.
 */
var Automaton = /** @class */ (function () {
    /**
     * Constructor
     */
    function Automaton() {
        this.states = new Array();
        this.transitions = new Array();
    }
    /**
     * Return the State with the given name
     * @param name - Name of the State we're looking for
     * @return A State if there is a State with the given name, null otherwise
     */
    Automaton.prototype.findState = function (name) {
        for (var i = 0; i < this.states.length; i++) {
            if (this.states[i].hasName(name)) {
                return this.states[i];
            }
        }
        return null;
    };
    /**
     * Add a State to the Automaton
     * @param state - State to be added
     */
    Automaton.prototype.addState = function (state) {
        this.states.push(state);
    };
    /**
     * Add a Transition to the Automaton
     * @param transition - Transition to be added
     */
    Automaton.prototype.addTransition = function (transition) {
        this.transitions.push(transition);
    };
    /**
     * Return the Transitions which start from the given State
     * @param from - State from which the Transitions we are looking for must start
     * @return Transitions which start from the given State
     */
    Automaton.prototype.getTransitionsFrom = function (from) {
        return this.transitions.filter(function (transition) {
            return transition.from.hasName(from);
        });
    };
    /**
     * Return the Transitions which arrives to the given State
     * @param to - State to which the Transitions we are looking for must arrive
     * @return Transitions which arrives to the given State
     */
    Automaton.prototype.getTransitionsTo = function (to) {
        return this.transitions.filter(function (transition) {
            return transition.to.hasName(to);
        });
    };
    /**
     * Return the Transitions which arrives to a final State
     * @return Transitions which arrives to a final State
     */
    Automaton.prototype.getTransitionsToFinalStates = function () {
        var transitions = [];
        var finalStates = this.states.filter(function (state) {
            return state.isFinal;
        });
        var self = this;
        finalStates.forEach(function (state) {
            transitions.push.apply(transitions, __spread(self.getTransitionsTo(state.name)));
        });
        return transitions;
    };
    /**
     * Test if the State with the given name is an initial State
     * @param stateName - Name of the tested State
     * @return True if the State is an initial State, False otherwise
     */
    Automaton.prototype.isInitial = function (stateName) {
        var state = this.findState(stateName);
        if (state != null) {
            return state.isInitial;
        }
        return false;
    };
    /**
     * Test if the State with the given name is a final State
     * @param stateName - Name of the tested State
     * @return True if the State is a final State, False otherwise
     */
    Automaton.prototype.isFinal = function (stateName) {
        var state = this.findState(stateName);
        if (state != null) {
            return state.isFinal;
        }
        return false;
    };
    Automaton.prototype.toString = function () {
        var result = "\n============ Automate ============\n";
        result += "\nETATS:\n\n";
        this.states.forEach(function (state) {
            result += "$ {state.toString()}\n";
        });
        result += "\nTRANSITIONS:\n\n";
        this.transitions.forEach(function (transition) {
            result += "$ {transition.toString()}\n";
        });
        result += "\n============ Automate ============\n";
        return result;
    };
    return Automaton;
}());
exports.Automaton = Automaton;
