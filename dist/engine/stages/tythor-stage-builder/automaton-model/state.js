"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.State = void 0;
/**
 * @author Julien Aimonier-Davat
 */
var State = /** @class */ (function () {
    function State(name, isInitial, isFinal) {
        this._name = name;
        this._isInitial = isInitial;
        this._isFinal = isFinal;
    }
    Object.defineProperty(State.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(State.prototype, "isInitial", {
        get: function () {
            return this._isInitial;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(State.prototype, "isFinal", {
        get: function () {
            return this._isFinal;
        },
        set: function (isFinal) {
            this._isFinal = isFinal;
        },
        enumerable: false,
        configurable: true
    });
    State.prototype.print = function (marginLeft) {
        if (marginLeft === void 0) { marginLeft = 0; }
        console.log(" ".repeat(marginLeft) + "> State{name: " + this.name + ", isInitial: " + this.isInitial + ", isFinal: " + this.isFinal + "}");
    };
    State.prototype.equals = function (other) {
        return this.name === other.name
            && this.isInitial === other.isInitial
            && this.isFinal === other.isFinal;
    };
    return State;
}());
exports.State = State;
