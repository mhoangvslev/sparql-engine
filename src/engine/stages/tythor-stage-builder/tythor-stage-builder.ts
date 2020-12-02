import PathStageBuilder from "../path-stage-builder";
import { Graph, ExecutionContext, PipelineStage, Pipeline, rdf } from "../../../api";
import { BuilderAlgebra, Algebra } from "sparqljs";
import { AutomatonBuilder } from "./automaton-builder/builder";
import { PathsCompressionOptimizer } from "./automaton-optimizer/paths-compression";
import { Automaton } from "./automaton-model/automaton";
import { PathsMergingOptimizer } from "./automaton-optimizer/paths-merging";
import { AlternativeTransition } from "./automaton-model/alternative-transition";
import { TyThorEngine } from "./tythor-engine/tythor-engine";
import { StatesMergingOptimizer } from "./automaton-optimizer/states-merging";
import { Transition } from "./automaton-model/transition";

/**
 * @author Julien Aimonier-Davat
 */
export default class TythorStageBuilder extends PathStageBuilder {
    
    _executePropertyPath(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        let tythorEngine: TyThorEngine = new TyThorEngine()
        
        let forward = !rdf.isVariable(subject) || (rdf.isVariable(subject) && rdf.isVariable(obj))
        
        let automaton: Automaton<Transition>
        if (this._options['property-paths-strategy'] == 'multi-predicate-automaton') {
            automaton = new PathsMergingOptimizer().optimize(
                new PathsCompressionOptimizer().optimize(
                    new StatesMergingOptimizer().optimize(
                        new AutomatonBuilder().build(path as BuilderAlgebra.PropertyPath, forward)
                    )
                )
            )
        } else if (this._options['property-paths-strategy'] == 'mono-predicate-automaton') {
            automaton = new AutomatonBuilder().build(path as BuilderAlgebra.PropertyPath, forward)
        } else {
            automaton = new PathsMergingOptimizer().optimize(
                new PathsCompressionOptimizer().optimize(
                    new StatesMergingOptimizer().optimize(
                        new AutomatonBuilder().build(path as BuilderAlgebra.PropertyPath, forward)
                    )
                )
            )
        }

        let engine = Pipeline.getInstance()
        let solutions = tythorEngine.evalPropertyPaths(forward ? subject : obj, automaton, forward ? obj : subject, graph, context)
        return engine.map(solutions, (triple: Algebra.TripleObject) => {
            return {
                subject: forward ? triple.subject : triple.object,
                predicate: triple.predicate,
                object: forward ? triple.object : triple.subject
            }
        })
    }
    
}