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
exports.AutomatonBuilder = void 0;
var lodash_1 = require("lodash");
var automaton_1 = require("../automaton-model/automaton");
var state_1 = require("../automaton-model/state");
var utils_1 = require("../utils");
var property_transition_1 = require("../automaton-model/property-transition");
var instruction_1 = require("../automaton-model/instruction");
function union(setA, setB) {
    var union = new Set(setA);
    setB.forEach(function (value) {
        union.add(value);
    });
    return union;
}
/**
 * @author Julien Aimonier-Davat
 */
var GlushkovAutomatonBuilder = /** @class */ (function () {
    function GlushkovAutomatonBuilder(syntaxTree) {
        this.syntaxTree = syntaxTree;
        this.properties = new Map();
        this.visit(syntaxTree);
    }
    GlushkovAutomatonBuilder.prototype.visitProperty = function (node) {
        var nodeID = node.id;
        node.first.add(nodeID);
        node.last.add(nodeID);
        this.properties.set(nodeID, node);
    };
    GlushkovAutomatonBuilder.prototype.visitSequenceExpression = function (node) {
        var e_1, _a, e_2, _b;
        node.nullable = true;
        try {
            for (var _c = __values(node.items), _d = _c.next(); !_d.done; _d = _c.next()) {
                var child_1 = _d.value;
                node.nullable = node.nullable && child_1.nullable;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var index = -1;
        var child;
        do {
            index++;
            child = node.items[index];
            node.first = union(node.first, child.first);
        } while (index < node.items.length - 1 && child.nullable);
        index = node.items.length;
        do {
            index--;
            child = node.items[index];
            node.last = union(node.last, child.last);
        } while (index > 0 && child.nullable);
        for (var i = 0; i < node.items.length - 1; i++) {
            child = node.items[i];
            try {
                for (var _e = (e_2 = void 0, __values(child.last)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var value = _f.value;
                    var lastOfChild = this.properties.get(value);
                    var suiv = i;
                    var nextChild = void 0;
                    do {
                        suiv++;
                        nextChild = node.items[suiv];
                        lastOfChild.follow = union(lastOfChild.follow, nextChild.first);
                    } while (suiv < node.items.length - 1 && nextChild.nullable);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    };
    GlushkovAutomatonBuilder.prototype.visitAlternativeExpression = function (node) {
        var e_3, _a;
        try {
            for (var _b = __values(node.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                var child = _c.value;
                node.nullable = node.nullable || child.nullable;
                node.first = union(node.first, child.first);
                node.last = union(node.last, child.last);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
    };
    GlushkovAutomatonBuilder.prototype.visitOneOrMoreExpression = function (node) {
        var e_4, _a;
        var child = node.items[0];
        node.nullable = child.nullable;
        node.first = child.first;
        node.last = child.last;
        try {
            for (var _b = __values(child.last), _c = _b.next(); !_c.done; _c = _b.next()) {
                var childLastID = _c.value;
                var childLast = this.properties.get(childLastID);
                childLast.follow = union(childLast.follow, child.first);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
    };
    GlushkovAutomatonBuilder.prototype.visitZeroOrOneExpression = function (node) {
        var child = node.items[0];
        node.nullable = true;
        node.first = child.first;
        node.last = child.last;
    };
    GlushkovAutomatonBuilder.prototype.visitZeroOrMoreExpression = function (node) {
        var e_5, _a;
        var child = node.items[0];
        node.nullable = true;
        node.first = child.first;
        node.last = child.last;
        try {
            for (var _b = __values(child.last), _c = _b.next(); !_c.done; _c = _b.next()) {
                var childLastID = _c.value;
                var childLast = this.properties.get(childLastID);
                childLast.follow = union(childLast.follow, child.first);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
    };
    GlushkovAutomatonBuilder.prototype.visitInverseExpression = function (node) {
        var child = node.items[0];
        node.nullable = child.nullable;
        node.first = child.first;
        node.last = child.last;
    };
    GlushkovAutomatonBuilder.prototype.visitPath = function (node) {
        switch (node.pathType) {
            case '/':
                this.visitSequenceExpression(node);
                break;
            case '|':
                this.visitAlternativeExpression(node);
                break;
            case '+':
                this.visitOneOrMoreExpression(node);
                break;
            case '?':
                this.visitZeroOrOneExpression(node);
                break;
            case '*':
                this.visitZeroOrMoreExpression(node);
                break;
            case '^':
                this.visitInverseExpression(node);
                break;
        }
    };
    GlushkovAutomatonBuilder.prototype.visitNode = function (node) {
        switch (node.type) {
            case "property":
                this.visitProperty(node);
                break;
            case "path":
                this.visitPath(node);
                break;
        }
    };
    GlushkovAutomatonBuilder.prototype.visit = function (node) {
        var e_6, _a;
        if (utils_1.isPathNode(node)) {
            try {
                for (var _b = __values(node.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    if (utils_1.isNode(child)) {
                        this.visit(child);
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
            }
        }
        this.visitNode(node);
    };
    GlushkovAutomatonBuilder.prototype.build = function () {
        var e_7, _a, e_8, _b, e_9, _c, e_10, _d;
        var automaton = new automaton_1.Automaton();
        var root = this.syntaxTree;
        // Creates and adds the initial state
        var initialState = new state_1.State(root.id, true, root.nullable);
        automaton.addState(initialState);
        try {
            // Creates and adds the other states
            for (var _e = __values(Array.from(this.properties.keys())), _f = _e.next(); !_f.done; _f = _e.next()) {
                var id = _f.value;
                var isFinal = root.last.has(id);
                automaton.addState(new state_1.State(id, false, isFinal));
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_7) throw e_7.error; }
        }
        try {
            // Adds the transitions that start from the initial state
            for (var _g = __values(root.first), _h = _g.next(); !_h.done; _h = _g.next()) {
                var value = _h.value;
                var toState = automaton.findState(value);
                var toNode = this.properties.get(value);
                if (utils_1.isPropertyNode(toNode)) {
                    var instruction = new instruction_1.Instruction(toNode.items, toNode.inverse, toNode.negation);
                    var transition = new property_transition_1.PropertyTransition(initialState, toState, instruction);
                    automaton.addTransition(transition);
                }
                else {
                    throw new Error("Unknown node encountered during automaton construction");
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
            }
            finally { if (e_8) throw e_8.error; }
        }
        try {
            // Adds the transitions between states
            for (var _j = __values(Array.from(this.properties.keys())), _k = _j.next(); !_k.done; _k = _j.next()) {
                var from = _k.value;
                var fromNode = this.properties.get(from);
                try {
                    for (var _l = (e_10 = void 0, __values(fromNode.follow)), _m = _l.next(); !_m.done; _m = _l.next()) {
                        var to = _m.value;
                        var fromState = automaton.findState(from);
                        var toState = automaton.findState(to);
                        var toNode = this.properties.get(to);
                        if (utils_1.isPropertyNode(toNode)) {
                            var instruction = new instruction_1.Instruction(toNode.items, toNode.inverse, toNode.negation);
                            var transition = new property_transition_1.PropertyTransition(fromState, toState, instruction);
                            automaton.addTransition(transition);
                        }
                        else {
                            throw new Error("Unknown node encountered during automaton construction");
                        }
                    }
                }
                catch (e_10_1) { e_10 = { error: e_10_1 }; }
                finally {
                    try {
                        if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                    }
                    finally { if (e_10) throw e_10.error; }
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
            }
            finally { if (e_9) throw e_9.error; }
        }
        return automaton;
    };
    return GlushkovAutomatonBuilder;
}());
/**
 * @author Julien Aimonier-Davat
 */
var AutomatonBuilder = /** @class */ (function () {
    function AutomatonBuilder() {
    }
    AutomatonBuilder.prototype.rewriteNegations = function (node) {
        var e_11, _a;
        try {
            for (var _b = __values(node.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                var child = _c.value;
                if (utils_1.isPathNode(child)) {
                    this.rewriteNegations(child);
                }
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_11) throw e_11.error; }
        }
        if (node.pathType === "!") {
            this.rewriteNegation(node);
        }
    };
    AutomatonBuilder.prototype.addNodeIdentifier = function (node, counter) {
        var e_12, _a;
        if (counter === void 0) { counter = 1; }
        if (utils_1.isPathNode(node)) {
            try {
                for (var _b = __values(node.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    if (utils_1.isNode(child)) {
                        counter = this.addNodeIdentifier(child, counter);
                    }
                }
            }
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_12) throw e_12.error; }
            }
        }
        node.id = counter++;
        return counter;
    };
    AutomatonBuilder.prototype.initializeTree = function (node) {
        node.first = new Set();
        node.last = new Set();
        node.follow = new Set();
        node.nullable = false;
        if (utils_1.isPathNode(node)) {
            for (var itemIndex = 0; itemIndex < node.items.length; itemIndex++) {
                var child = node.items[itemIndex];
                if (typeof child === "string") {
                    var property = {
                        items: [node.items[itemIndex]],
                        negation: false,
                        inverse: false,
                        nullable: false,
                        first: new Set(),
                        last: new Set(),
                        follow: new Set(),
                        type: "property"
                    };
                    node.items[itemIndex] = property;
                }
                else {
                    this.initializeTree(child);
                }
            }
        }
    };
    AutomatonBuilder.prototype.rewriteNegation = function (node) {
        var forwardProperties = new Array();
        var backwardProperties = new Array();
        function visitChild(pathNode) {
            var e_13, _a;
            try {
                for (var _b = __values(pathNode.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    if (utils_1.isPropertyNode(child)) {
                        if (child.inverse) {
                            backwardProperties.push.apply(backwardProperties, __spread(child.items));
                        }
                        else {
                            forwardProperties.push.apply(forwardProperties, __spread(child.items));
                        }
                    }
                    else if (utils_1.isPathNode(child)) {
                        visitChild(child);
                    }
                }
            }
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_13) throw e_13.error; }
            }
        }
        visitChild(node);
        node.pathType = "|";
        node.items = new Array();
        if (backwardProperties.length > 0) {
            var backwardNode = {
                items: backwardProperties,
                negation: true,
                inverse: true,
                nullable: false,
                first: new Set(),
                last: new Set(),
                follow: new Set(),
                type: "property"
            };
            node.items.push(backwardNode);
        }
        if (forwardProperties.length > 0) {
            var forwardNode = {
                items: forwardProperties,
                negation: true,
                inverse: false,
                nullable: false,
                first: new Set(),
                last: new Set(),
                follow: new Set(),
                type: "property"
            };
            node.items.push(forwardNode);
        }
    };
    AutomatonBuilder.prototype.pushDownInverses = function (node) {
        var e_14, _a;
        if (utils_1.isPathNode(node)) {
            try {
                for (var _b = __values(node.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    if (utils_1.isNode(child)) {
                        this.pushDownInverses(child);
                    }
                }
            }
            catch (e_14_1) { e_14 = { error: e_14_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_14) throw e_14.error; }
            }
            if (node.pathType === '^') {
                this.inverseSequences(node);
                this.pushDownInverse(node);
            }
        }
    };
    AutomatonBuilder.prototype.inverseSequences = function (node) {
        var e_15, _a;
        if (utils_1.isPathNode(node)) {
            if (node.pathType === '/') {
                node.items = node.items.reverse();
            }
            try {
                for (var _b = __values(node.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    if (utils_1.isNode(child)) {
                        this.inverseSequences(child);
                    }
                }
            }
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_15) throw e_15.error; }
            }
        }
    };
    AutomatonBuilder.prototype.pushDownInverse = function (node) {
        var e_16, _a;
        if (utils_1.isPropertyNode(node)) {
            node.inverse = !node.inverse;
        }
        else if (utils_1.isPathNode(node)) {
            try {
                for (var _b = __values(node.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    if (utils_1.isNode(child)) {
                        this.pushDownInverse(child);
                    }
                }
            }
            catch (e_16_1) { e_16 = { error: e_16_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_16) throw e_16.error; }
            }
        }
    };
    AutomatonBuilder.prototype.printTree = function (node, depth) {
        if (depth === void 0) { depth = 0; }
        node = node;
        switch (node.type) {
            case "path":
                var path = node;
                console.log(" ".repeat(depth) + " > Non-transitive Path{id: " + path.id + ", pathType: " + path.pathType + "}");
                for (var i = 0; i < path.items.length; i++) {
                    this.printTree(path.items[i], depth + 3);
                }
                break;
            case "property":
                var property = node;
                console.log(" ".repeat(depth) + " > Property{id: " + property.id + ", \n                    items: " + property.items + ", \n                    negation: " + property.negation + ", \n                    inverse: " + property.inverse + ",\n                    nullable: " + property.nullable + ",\n                    first: " + property.first + ",\n                    last: " + property.last + ",\n                    folow: " + property.follow + "}");
                break;
            default:
                break;
        }
    };
    AutomatonBuilder.prototype.build = function (propertyPath, forward) {
        var syntaxTree = lodash_1.cloneDeep(propertyPath);
        this.initializeTree(syntaxTree);
        if (!forward) {
            this.inverseSequences(syntaxTree);
            this.pushDownInverse(syntaxTree);
        }
        this.pushDownInverses(syntaxTree);
        this.rewriteNegations(syntaxTree);
        this.addNodeIdentifier(syntaxTree);
        return new GlushkovAutomatonBuilder(syntaxTree).build();
    };
    return AutomatonBuilder;
}());
exports.AutomatonBuilder = AutomatonBuilder;
