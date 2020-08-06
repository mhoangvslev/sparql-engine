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
exports.TyThorEngineWithoutNodeRemembering = void 0;
var api_1 = require("../../../../api");
var tythor_state_1 = require("./tythor-state");
var tythor_engine_1 = require("./tythor-engine");
/**
 * @author Julien Aimonier-Davat
 */
var TyThorEngineWithoutNodeRemembering = /** @class */ (function (_super) {
    __extends(TyThorEngineWithoutNodeRemembering, _super);
    function TyThorEngineWithoutNodeRemembering() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TyThorEngineWithoutNodeRemembering.prototype.computeNextStep = function (searchState, automaton, graph, ppContext, context) {
        var _this = this;
        var engine = api_1.Pipeline.getInstance();
        if (ppContext.stop) {
            return engine.empty();
        }
        var newSolution = engine.empty();
        if (searchState.state.isFinal && ppContext.isSolution(searchState.subject, searchState.object)) {
            newSolution = engine.of(searchState);
        }
        var nextSolutions = engine.mergeMap(engine.from(automaton.findTransitionsFrom(searchState.state)), function (transition) {
            return engine.mergeMap(_this.evalTransition(searchState, transition, graph, context), function (result) {
                return _this.computeNextStep(result, automaton, graph, ppContext, context);
            });
        });
        return engine.merge(newSolution, nextSolutions);
    };
    TyThorEngineWithoutNodeRemembering.prototype.computeFirstStep = function (automaton, graph, ppContext, context) {
        var _this = this;
        var engine = api_1.Pipeline.getInstance();
        var initialState = automaton.findInitialStates()[0];
        return engine.mergeMap(engine.from(automaton.findTransitionsFrom(initialState)), function (transition) {
            var query = transition.buildQuery(api_1.rdf.isVariable(ppContext.subject) ? '?tythorSubject' : ppContext.subject, '?tythorObject');
            return engine.mergeMap(graph.evalQuery(query, context), function (solution) {
                var solutionSubject = api_1.rdf.isVariable(ppContext.subject) ? solution.get('?tythorSubject') : ppContext.subject;
                var solutionObject = solution.get('?tythorObject');
                var searchState = new tythor_state_1.TythorState(solutionSubject, solutionObject, transition.to);
                return _this.computeNextStep(searchState, automaton, graph, ppContext, context);
            });
        });
    };
    return TyThorEngineWithoutNodeRemembering;
}(tythor_engine_1.TyThorEngine));
exports.TyThorEngineWithoutNodeRemembering = TyThorEngineWithoutNodeRemembering;
