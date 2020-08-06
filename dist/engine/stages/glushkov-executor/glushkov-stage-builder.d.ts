import PathStageBuilder from "../path-stage-builder";
import { Algebra } from "sparqljs";
import Graph from "../../../rdf/graph";
import ExecutionContext from "../../context/execution-context";
import Dataset from "../../../rdf/dataset";
import { Automaton } from "./automaton";
import { PipelineStage } from '../../../engine/pipeline/pipeline-engine';
/**
 * A Step in the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
declare class Step {
    private _node;
    private _state;
    /**
     * Constructor
     * @param node - The label of a node in the RDF Graph
     * @param state - The ID of a State in the Automaton
     */
    constructor(node: string, state: number);
    /**
     * Get the Automaton's state associated with this Step of the ResultPath
     * @return The Automaton's state associated with this Step
     */
    get state(): number;
    /**
     * Get the RDF Graph's node associated with this Step of the ResultPath
     * @return The RDF Graph's node associated with this Step
     */
    get node(): string;
    /**
     * Test if the given Step is equal to this Step
     * @param step - Step tested
     * @return True if the Steps are equal, False otherwise
     */
    equals(step: Step): boolean;
    /**
     * Build a clone of this Step
     * @return A copy of this Step
     */
    clone(): Step;
}
/**
 * A solution path, found during the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
declare class ResultPath {
    private _steps;
    /**
     * Constructor
     */
    constructor();
    /**
     * Add a Step to the ResultPath
     * @param step - New Step to add
     */
    add(step: Step): void;
    /**
     * Return the last Step of the ResultPath
     * @return The last Step of the ResultPath
     */
    lastStep(): Step;
    /**
     * Return the first Step of the ResultPath
     * @return The first Step of the ResultPath
     */
    firstStep(): Step;
    /**
     * Test if a Step is already contained in the ResultPath
     * @param step - Step we're looking for in the ResultPath
     * @return True if the given Step is in the ResultPath, False otherwise
     */
    contains(step: Step): boolean;
    /**
     * Build a clone of this ResultPath
     * @return A copy of this ResultPath
     */
    clone(): ResultPath;
}
/**
 * A GlushkovStageBuilder is responsible for evaluation a SPARQL property path query using a Glushkov state automata.
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
export default class GlushkovStageBuilder extends PathStageBuilder {
    /**
     * Constructor
     * @param dataset - RDF Dataset used during query execution
     */
    constructor(dataset: Dataset);
    /**
     * Continues the execution of the SPARQL property path and builds the result's paths
     * @param rPath - Path being processed
     * @param obj - Path object
     * @param graph - RDF graph
     * @param context - Execution context
     * @param automaton - Automaton used to evaluate the SPARQL property path
     * @param forward - if True the walk proceeds through outgoing edges, otherwise the walk proceeds in reverse direction
     * @return An Observable which yield RDF triples matching the property path
     */
    evaluatePropertyPath(rPath: ResultPath, obj: string, graph: Graph, context: ExecutionContext, automaton: Automaton<number, string>, forward: boolean): PipelineStage<Algebra.TripleObject>;
    /**
     * Execute a reflexive closure against a RDF Graph.
     * @param subject - Path subject
     * @param obj - Path object
     * @param graph - RDF graph
     * @param context - Execution context
     * @return An Observable which yield RDF triples retrieved after the evaluation of the reflexive closure
     */
    reflexiveClosure(subject: string, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject>;
    /**
     * Starts the execution of a property path against a RDF Graph.
     * - executes the reflexive closure if the path expression contains the empty word
     * - builds the first step of the result's paths
     * @param subject - Path subject
     * @param obj - Path object
     * @param graph - RDF graph
     * @param context - Execution context
     * @param automaton - Automaton used to evaluate the SPARQL property path
     * @param forward - if True the walk starts from the subject, otherwise the walk starts from the object
     * @return An Observable which yield RDF triples matching the property path
     */
    startPropertyPathEvaluation(subject: string, obj: string, graph: Graph, context: ExecutionContext, automaton: Automaton<number, string>, forward: boolean): PipelineStage<Algebra.TripleObject>;
    /**
     * Execute a property path against a RDF Graph.
     * @param  subject - Path subject
     * @param  path  - Property path
     * @param  obj   - Path object
     * @param  graph - RDF graph
     * @param  context - Execution context
     * @return An Observable which yield RDF triples matching the property path
     */
    _executePropertyPath(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject>;
}
export {};
