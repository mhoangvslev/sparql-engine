import { BuilderAlgebra } from 'sparqljs'
import { Transition } from './automaton-model/transition'
import { ClosureTransition } from './automaton-model/closure-transition'

export function isNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.Node {
    return typeof node !== "string"
}

export function isPathNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.PropertyPath {
    return typeof node !== "string" && node.type === "path"
}

export function isPropertyNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.Property {
    return typeof node !== "string" && node.type === "property"
}

export function isClosureNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.Closure {
    return typeof node !== "string" && node.type == "closure"
}

export function isClosureTransition(transition: Transition | ClosureTransition<Transition>): transition is ClosureTransition<Transition> {
    return transition instanceof ClosureTransition
}