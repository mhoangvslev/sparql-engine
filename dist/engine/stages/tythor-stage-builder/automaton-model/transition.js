"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transition = void 0;
/**
 * @author Julien Aimonier-Davat
 */
var Transition = /** @class */ (function () {
    function Transition(from, to) {
        this._from = from;
        this._to = to;
    }
    Object.defineProperty(Transition.prototype, "from", {
        get: function () {
            return this._from;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Transition.prototype, "to", {
        get: function () {
            return this._to;
        },
        set: function (state) {
            this._to = state;
        },
        enumerable: false,
        configurable: true
    });
    Transition.prototype.buildFilter = function (variable, predicates) {
        var node = {
            type: 'filter',
            expression: {
                type: 'operation',
                operator: '!=',
                args: [variable, predicates[0]]
            }
        };
        for (var i = 1; i < predicates.length; i++) {
            var expression = {
                type: 'operation',
                operator: '&&',
                args: [node.expression, {
                        type: 'operation',
                        operator: '!=',
                        args: [variable, predicates[i]]
                    }]
            };
            node.expression = expression;
        }
        return node;
    };
    Transition.prototype.print = function (marginLeft) {
        console.log(" ".repeat(marginLeft) + "> Transition{\n            from: " + this.from.name + ", \n            to: " + this.to.name + ",\n        }");
    };
    Transition.prototype.equals = function (other) {
        return this.from.equals(other.from) && this.to.equals(other.to);
    };
    return Transition;
}());
exports.Transition = Transition;
