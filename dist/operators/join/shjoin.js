"use strict";
/* file : shjoin.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
var pipeline_1 = require("../../engine/pipeline/pipeline");
var hash_join_table_1 = require("./hash-join-table");
/**
 * Utility function used to perform one half of a symmetric hash join
 * @param  joinKey - SPARQL variable used as join attribute
 * @param  source  - Source of bindings (a {@link PipelineStage})
 * @param  innerTable - Hash table in which bindings are inserted
 * @param  outerTable - Hash table in which bindings are probed
 * @return A {@link PipelineStage} that performs one half of a symmetric hash join
 */
function halfHashJoin(joinKey, source, innerTable, outerTable) {
    var engine = pipeline_1.Pipeline.getInstance();
    return engine.mergeMap(source, function (bindings) {
        if (!bindings.has(joinKey)) {
            return engine.empty();
        }
        var key = bindings.get(joinKey);
        // insert into inner table
        innerTable.put(key, bindings);
        // probe into outer table
        return engine.from(outerTable.join(key, bindings));
    });
}
/**
 * Perform a Symmetric Hash Join between two sources
 * @param  joinKey - SPARQL variable used as join attribute
 * @param  left - Left source (a {@link PipelineStage})
 * @param  right - Right source (a {@link PipelineStage})
 * @return A {@link PipelineStage} that performs a symmetric hash join between the sources
 */
function symHashJoin(joinKey, left, right) {
    var leftTable = new hash_join_table_1.default();
    var rightTable = new hash_join_table_1.default();
    var leftOp = halfHashJoin(joinKey, left, leftTable, rightTable);
    var rightOp = halfHashJoin(joinKey, right, rightTable, leftTable);
    return pipeline_1.Pipeline.getInstance().merge(leftOp, rightOp);
}
exports.default = symHashJoin;
