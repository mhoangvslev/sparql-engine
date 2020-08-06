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
exports.Instruction = void 0;
/**
 * @author Julien Aimonier-Davat
 */
var Instruction = /** @class */ (function () {
    function Instruction(properties, inverse, negation) {
        this._properties = properties;
        this._inverse = inverse;
        this._negation = negation;
    }
    Object.defineProperty(Instruction.prototype, "properties", {
        get: function () {
            return this._properties;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "inverse", {
        get: function () {
            return this._inverse;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "negation", {
        get: function () {
            return this._negation;
        },
        enumerable: false,
        configurable: true
    });
    Instruction.prototype.equals = function (other) {
        var e_1, _a;
        if (this.negation !== other.negation || this.inverse !== other.inverse) {
            return false;
        }
        try {
            for (var _b = __values(other.properties), _c = _b.next(); !_c.done; _c = _b.next()) {
                var property = _c.value;
                if (!this.properties.includes(property)) {
                    return false;
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
        return true;
    };
    return Instruction;
}());
exports.Instruction = Instruction;
