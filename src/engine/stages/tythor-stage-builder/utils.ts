import { TythorAlgebra } from 'sparqljs'
import { Transition } from './automaton-model/transition'
import { TransitiveTransition } from './automaton-model/transitive-transition'
import { NonTransitiveTransition } from './automaton-model/non-transitive-transition'

export function isNode(node: TythorAlgebra.Node | string): node is TythorAlgebra.Node {
    return typeof node !== "string"
}

export function isPathNode(node: TythorAlgebra.Node | string): node is TythorAlgebra.PropertyPath {
    return typeof node !== "string" && node.type === "path"
}

export function isPropertyNode(node: TythorAlgebra.Node | string): node is TythorAlgebra.Property {
    return typeof node !== "string" && node.type === "property"
}

export function isClosureNode(node: TythorAlgebra.Node | string): node is TythorAlgebra.Closure {
    return typeof node !== "string" && node.type == "closure"
}

export function isTransitiveTransition(transition: Transition): transition is TransitiveTransition {
    return transition instanceof TransitiveTransition
}

export function isNonTransitiveTransition(transition: Transition): transition is NonTransitiveTransition {
    return transition instanceof TransitiveTransition
}