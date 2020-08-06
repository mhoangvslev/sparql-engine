"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var path_stage_builder_1 = require("../path-stage-builder");
var api_1 = require("../../../api");
var builder_1 = require("./automaton-builder/builder");
var paths_compression_1 = require("./automaton-optimizer/paths-compression");
var paths_merging_1 = require("./automaton-optimizer/paths-merging");
var tythor_engine_1 = require("./tythor-engine/tythor-engine");
var states_merging_1 = require("./automaton-optimizer/states-merging");
var distinct_paths_1 = require("./automaton-optimizer/distinct-paths");
var tythor_engine_without_node_remembering_1 = require("./tythor-engine/tythor-engine-without-node-remembering");
/**
 * @author Julien Aimonier-Davat
 */
var TythorStageBuilder = /** @class */ (function (_super) {
    __extends(TythorStageBuilder, _super);
    function TythorStageBuilder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TythorStageBuilder.prototype._executePropertyPath = function (subject, path, obj, graph, context) {
        // let tythorEngine: TyThorEngine = new TyThorEngine()
        var tythorEngine;
        var automaton;
        var forward = !api_1.rdf.isVariable(subject) || (api_1.rdf.isVariable(subject) && api_1.rdf.isVariable(obj));
        // let automaton: Automaton<AlternativeTransition> = new PathsMergingOptimizer().optimize(
        //     new DistinctPathsOptimizer().optimize(
        //         new StatesMergingOptimizer().optimize(
        //             new PathsCompressionOptimizer().optimize(
        //                 new AutomatonBuilder().build(path as BuilderAlgebra.PropertyPath, forward)
        //             )
        //         )
        //     )
        // )
        if (path.pathType === '*' || path.pathType === '+') {
            tythorEngine = new tythor_engine_1.TyThorEngine();
            automaton = new paths_merging_1.PathsMergingOptimizer().optimize(new distinct_paths_1.DistinctPathsOptimizer().optimize(new states_merging_1.StatesMergingOptimizer().optimize(new paths_compression_1.PathsCompressionOptimizer().optimize(new builder_1.AutomatonBuilder().build(path, forward)))));
        }
        else {
            tythorEngine = new tythor_engine_without_node_remembering_1.TyThorEngineWithoutNodeRemembering();
            automaton = new paths_merging_1.PathsMergingOptimizer().optimize(new states_merging_1.StatesMergingOptimizer().optimize(new paths_compression_1.PathsCompressionOptimizer().optimize(new builder_1.AutomatonBuilder().build(path, forward))));
        }
        var engine = api_1.Pipeline.getInstance();
        var solutions = tythorEngine.evalPropertyPaths(forward ? subject : obj, automaton, forward ? obj : subject, graph, context);
        return engine.map(solutions, function (triple) {
            return {
                subject: forward ? triple.subject : triple.object,
                predicate: triple.predicate,
                object: forward ? triple.object : triple.subject
            };
        });
    };
    return TythorStageBuilder;
}(path_stage_builder_1.default));
exports.default = TythorStageBuilder;
