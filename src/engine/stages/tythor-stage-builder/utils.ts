import { BuilderAlgebra } from 'sparqljs'

export function isNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.Node {
    return typeof node !== "string"
}

export function isPathNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.PropertyPath {
    return typeof node !== "string" && node.type === "path"
}

export function isPropertyNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.Property {
    return typeof node !== "string" && node.type === "property"
}