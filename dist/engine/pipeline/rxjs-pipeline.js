/* file : rxjs-pipeline.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

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
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.RxjsStreamInput = void 0;
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var pipeline_engine_1 = require("./pipeline-engine");
/**
 * A StreamPipelineInput implemented using Rxjs' subscribers.
 * @author Thomas Minier
 */
var RxjsStreamInput = /** @class */ (function () {
    function RxjsStreamInput(subscriber) {
        this._subscriber = subscriber;
    }
    RxjsStreamInput.prototype.next = function (value) {
        this._subscriber.next(value);
    };
    RxjsStreamInput.prototype.complete = function () {
        this._subscriber.complete();
    };
    RxjsStreamInput.prototype.error = function (err) {
        this._subscriber.error(err);
    };
    return RxjsStreamInput;
}());
exports.RxjsStreamInput = RxjsStreamInput;
/**
 * A pipeline implemented using Rx.js
 * @author Thomas Minier
 */
var RxjsPipeline = /** @class */ (function (_super) {
    __extends(RxjsPipeline, _super);
    function RxjsPipeline() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RxjsPipeline.prototype.empty = function () {
        return rxjs_1.empty();
    };
    RxjsPipeline.prototype.of = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        return rxjs_1.of.apply(void 0, __spread(values));
    };
    RxjsPipeline.prototype.from = function (x) {
        return rxjs_1.from(x);
    };
    RxjsPipeline.prototype.fromAsync = function (cb) {
        return new rxjs_1.Observable(function (subscriber) { return cb(new RxjsStreamInput(subscriber)); });
    };
    RxjsPipeline.prototype.clone = function (stage) {
        return stage.pipe(operators_1.shareReplay(5));
    };
    RxjsPipeline.prototype.catch = function (input, handler) {
        return input.pipe(operators_1.catchError(function (err) {
            if (handler === undefined) {
                throw err;
            }
            else {
                return handler(err);
            }
        }));
    };
    RxjsPipeline.prototype.merge = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return rxjs_1.concat.apply(void 0, __spread(inputs));
    };
    RxjsPipeline.prototype.map = function (input, mapper) {
        return input.pipe(operators_1.map(mapper));
    };
    RxjsPipeline.prototype.flatMap = function (input, mapper) {
        return input.pipe(operators_1.flatMap(mapper));
    };
    RxjsPipeline.prototype.mergeMap = function (input, mapper) {
        return input.pipe(operators_1.mergeMap(mapper));
    };
    RxjsPipeline.prototype.filter = function (input, predicate) {
        return input.pipe(operators_1.filter(predicate));
    };
    RxjsPipeline.prototype.finalize = function (input, callback) {
        return input.pipe(operators_1.finalize(callback));
    };
    RxjsPipeline.prototype.reduce = function (input, reducer, initial) {
        return input.pipe(operators_1.reduce(reducer, initial));
    };
    RxjsPipeline.prototype.limit = function (input, stopAfter) {
        return input.pipe(operators_1.take(stopAfter));
    };
    RxjsPipeline.prototype.skip = function (input, toSkip) {
        return input.pipe(operators_1.skip(toSkip));
    };
    RxjsPipeline.prototype.distinct = function (input, selector) {
        return input.pipe(operators_1.distinct(selector));
    };
    RxjsPipeline.prototype.defaultValues = function (input) {
        var values = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            values[_i - 1] = arguments[_i];
        }
        if (values.length === 0) {
            return input;
        }
        else if (values.length === 1) {
            return input.pipe(operators_1.defaultIfEmpty(values[0]));
        }
        else {
            return new rxjs_1.Observable(function (subscriber) {
                var isEmpty = true;
                return input.subscribe(function (x) {
                    isEmpty = false;
                    subscriber.next(x);
                }, function (err) { return subscriber.error(err); }, function () {
                    if (isEmpty) {
                        values.forEach(function (v) { return subscriber.next(v); });
                    }
                    subscriber.complete();
                });
            });
        }
    };
    RxjsPipeline.prototype.bufferCount = function (input, count) {
        return input.pipe(operators_1.bufferCount(count));
    };
    RxjsPipeline.prototype.forEach = function (input, cb) {
        input.forEach(cb)
            .then()
            .catch(function (err) { throw err; });
    };
    RxjsPipeline.prototype.first = function (input) {
        return input.pipe(operators_1.first());
    };
    RxjsPipeline.prototype.endWith = function (input, values) {
        return input.pipe(operators_1.endWith.apply(void 0, __spread(values)));
    };
    RxjsPipeline.prototype.tap = function (input, cb) {
        return input.pipe(operators_1.tap(cb));
    };
    RxjsPipeline.prototype.collect = function (input) {
        return input.pipe(operators_1.toArray());
    };
    return RxjsPipeline;
}(pipeline_engine_1.PipelineEngine));
exports.default = RxjsPipeline;
