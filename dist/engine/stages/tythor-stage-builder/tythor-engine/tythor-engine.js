"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TyThorEngine = void 0;
var api_1 = require("../../../../api");
var tythor_context_1 = require("./tythor-context");
var tythor_state_1 = require("./tythor-state");
/**
 * @author Julien Aimonier-Davat
 * Evaluates path expressions using a set semantics. This engine must be used
 * to compute transitive closure expressions. Non-transitive expressions must
 * have been rewritten during the optimization of the query plan.
 */
var TyThorEngine = /** @class */ (function () {
    function TyThorEngine() {
    }
    TyThorEngine.prototype.evalTransition = function (searchState, transition, graph, context) {
        var engine = api_1.Pipeline.getInstance();
        var query = transition.buildQuery(searchState.object, '?tythorObject');
        return engine.map(graph.evalQuery(query, context), function (solution) {
            return new tythor_state_1.TythorState(searchState.subject, solution.get('?tythorObject'), transition.to);
        });
    };
    TyThorEngine.prototype.computeNextStep = function (searchState, automaton, graph, ppContext, context) {
        var _this = this;
        var engine = api_1.Pipeline.getInstance();
        if (ppContext.stop) {
            return engine.empty();
        }
        var newSolution = engine.empty();
        if (searchState.state.isFinal) {
            if (!ppContext.visited(searchState.subject, searchState.object) && ppContext.isSolution(searchState.subject, searchState.object)) {
                newSolution = engine.of(searchState);
            }
            if (ppContext.visited(searchState.subject, searchState.object)) {
                return engine.empty();
            }
            else {
                ppContext.visit(searchState.subject, searchState.object);
            }
        }
        var nextSolutions = engine.mergeMap(engine.from(automaton.findTransitionsFrom(searchState.state)), function (transition) {
            return engine.mergeMap(_this.evalTransition(searchState, transition, graph, context), function (result) {
                return _this.computeNextStep(result, automaton, graph, ppContext, context);
            });
        });
        return engine.merge(newSolution, nextSolutions);
    };
    TyThorEngine.prototype.computeFirstStep = function (automaton, graph, ppContext, context) {
        var _this = this;
        var engine = api_1.Pipeline.getInstance();
        var initialState = automaton.findInitialStates()[0];
        return engine.mergeMap(engine.from(automaton.findTransitionsFrom(initialState)), function (transition) {
            var query = transition.buildQuery(api_1.rdf.isVariable(ppContext.subject) ? '?tythorSubject' : ppContext.subject, '?tythorObject');
            return engine.mergeMap(graph.evalQuery(query, context), function (solution) {
                var solutionSubject = api_1.rdf.isVariable(ppContext.subject) ? solution.get('?tythorSubject') : ppContext.subject;
                var solutionObject = solution.get('?tythorObject');
                var searchState = new tythor_state_1.TythorState(solutionSubject, solutionObject, transition.to);
                if (initialState.isFinal) {
                    ppContext.visit(solutionSubject, solutionSubject);
                }
                return _this.computeNextStep(searchState, automaton, graph, ppContext, context);
            });
        });
    };
    TyThorEngine.prototype.reflexiveClosure = function (subject, object, graph, context) {
        var engine = api_1.Pipeline.getInstance();
        if (api_1.rdf.isVariable(subject) && !api_1.rdf.isVariable(object)) {
            return engine.of({
                subject: object,
                predicate: "",
                object: object
            });
        }
        else if (!api_1.rdf.isVariable(subject) && api_1.rdf.isVariable(object)) {
            return engine.of({
                subject: subject,
                predicate: "",
                object: subject
            });
        }
        else if (api_1.rdf.isVariable(subject) && api_1.rdf.isVariable(object)) {
            var bgp = [{ subject: '?s', predicate: '?p', object: '?o' }];
            return engine.distinct(engine.mergeMap(graph.evalBGP(bgp, context), function (bindings) {
                var subjectMapping = bindings.get('?s');
                var objectMapping = bindings.get('?o');
                return engine.of({
                    subject: subjectMapping,
                    predicate: "",
                    object: subjectMapping
                }, {
                    subject: objectMapping,
                    predicate: "",
                    object: objectMapping
                });
            }), function (step) { return step.subject; });
        }
        else if (subject === object) {
            return engine.of({
                subject: subject,
                predicate: "",
                object: object
            });
        }
        else {
            return engine.empty();
        }
    };
    TyThorEngine.prototype.evalPropertyPaths = function (subject, automaton, obj, graph, context) {
        var engine = api_1.Pipeline.getInstance();
        var ppContext = new tythor_context_1.TythorContext(subject, obj);
        var transitiveClosureSolutions = engine.map(this.computeFirstStep(automaton, graph, ppContext, context), function (solution) {
            return {
                subject: solution.subject,
                predicate: "",
                object: solution.object
            };
        });
        var reflexiveClosureSolutions = engine.empty();
        var initialState = automaton.findInitialStates()[0];
        if (initialState.isFinal) {
            reflexiveClosureSolutions = this.reflexiveClosure(subject, obj, graph, context);
        }
        return engine.merge(transitiveClosureSolutions, reflexiveClosureSolutions);
    };
    return TyThorEngine;
}());
exports.TyThorEngine = TyThorEngine;
