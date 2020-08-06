import { BuilderAlgebra } from 'sparqljs';
export declare function isNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.Node;
export declare function isPathNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.PropertyPath;
export declare function isPropertyNode(node: BuilderAlgebra.Node | string): node is BuilderAlgebra.Property;
