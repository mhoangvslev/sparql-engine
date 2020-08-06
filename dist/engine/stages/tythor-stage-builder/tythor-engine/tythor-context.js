"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TythorContext = void 0;
var api_1 = require("../../../../api");
/**
 * @author Julien Aimonier-Davat
 */
var TythorContext = /** @class */ (function () {
    function TythorContext(subject, object) {
        this._subject = subject;
        this._object = object;
        this._visited = new Map();
        this._stop = false;
        this._solution = 0;
    }
    Object.defineProperty(TythorContext.prototype, "subject", {
        get: function () {
            return this._subject;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TythorContext.prototype, "object", {
        get: function () {
            return this._object;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TythorContext.prototype, "stop", {
        get: function () {
            return this._stop;
        },
        set: function (value) {
            this._stop = value;
        },
        enumerable: false,
        configurable: true
    });
    TythorContext.prototype.visited = function (subject, node) {
        if (this._visited.has(subject)) {
            return this._visited.get(subject).has(node);
        }
        return false;
    };
    TythorContext.prototype.visit = function (subject, node) {
        if (this._visited.has(subject)) {
            this._visited.get(subject).set(node, node);
        }
        else {
            var visitedNodes = new Map();
            visitedNodes.set(node, node);
            this._visited.set(subject, visitedNodes);
        }
    };
    TythorContext.prototype.isSolution = function (subject, object) {
        if (api_1.rdf.isVariable(this.subject) && api_1.rdf.isVariable(this.object)) {
            if (this.subject === this.object) {
                return subject === object;
            }
            else {
                return true;
            }
        }
        if (api_1.rdf.isVariable(this.object)) {
            return true;
        }
        else if (this.object === object) {
            this.stop = true;
            return true;
        }
        else {
            return false;
        }
    };
    return TythorContext;
}());
exports.TythorContext = TythorContext;
