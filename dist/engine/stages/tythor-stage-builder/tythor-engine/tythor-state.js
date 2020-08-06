"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TythorState = void 0;
/**
 * @author Julien Aimonier-Davat
 */
var TythorState = /** @class */ (function () {
    function TythorState(subject, object, state) {
        this._subject = subject;
        this._object = object;
        this._state = state;
    }
    Object.defineProperty(TythorState.prototype, "subject", {
        get: function () {
            return this._subject;
        },
        set: function (subject) {
            this._subject = subject;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TythorState.prototype, "object", {
        get: function () {
            return this._object;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TythorState.prototype, "state", {
        get: function () {
            return this._state;
        },
        set: function (state) {
            this._state = state;
        },
        enumerable: false,
        configurable: true
    });
    TythorState.prototype.copy = function () {
        return new TythorState(this.subject, this.object, this.state);
    };
    TythorState.prototype.toString = function () {
        return "{subject: " + this._subject + ", object: " + this._object + ", state: " + this._state.name + "}";
    };
    return TythorState;
}());
exports.TythorState = TythorState;
