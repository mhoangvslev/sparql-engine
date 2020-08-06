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
import { DistinctPathsOptimizer } from "./automaton-optimizer/distinct-paths";
import { Transition } from "./automaton-model/transition";
import { TyThorEngineWithoutNodeRemembering } from "./tythor-engine/tythor-engine-without-node-remembering";

/**
 * @author Julien Aimonier-Davat
 */
export default class TythorStageBuilder extends PathStageBuilder {
    
    _executePropertyPath(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        // let tythorEngine: TyThorEngine = new TyThorEngine()

        let tythorEngine: TyThorEngine
        let automaton: Automaton<Transition>

        let forward = !rdf.isVariable(subject) || (rdf.isVariable(subject) && rdf.isVariable(obj))
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
            tythorEngine = new TyThorEngine()
            automaton = new PathsMergingOptimizer().optimize(
                new DistinctPathsOptimizer().optimize(
                    new StatesMergingOptimizer().optimize(
                        new PathsCompressionOptimizer().optimize(
                            new AutomatonBuilder().build(path as BuilderAlgebra.PropertyPath, forward)
                        )
                    )
                )
            )
        } else {
            tythorEngine = new TyThorEngineWithoutNodeRemembering()
            automaton = new PathsMergingOptimizer().optimize(
                new StatesMergingOptimizer().optimize(
                    new PathsCompressionOptimizer().optimize(
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