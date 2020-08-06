import PathStageBuilder from "../path-stage-builder";
import { Graph, ExecutionContext, PipelineStage } from "../../../api";
import { Algebra } from "sparqljs";
/**
 * @author Julien Aimonier-Davat
 */
export default class TythorStageBuilder extends PathStageBuilder {
    _executePropertyPath(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject>;
}
