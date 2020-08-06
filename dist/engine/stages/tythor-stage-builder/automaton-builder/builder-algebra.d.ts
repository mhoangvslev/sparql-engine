/// <reference types="sparqljs" />
declare module "sparqljs" {
    namespace BuilderAlgebra {
        interface Node {
            id?: number;
            type: string;
            nullable: boolean;
            first: Set<number>;
            last: Set<number>;
            follow: Set<number>;
        }
        interface Property extends Node {
            items: string[];
            negation: boolean;
            inverse: boolean;
        }
        interface PropertyPath extends Omit<Algebra.PropertyPath, 'items'>, Node {
            items: Array<string | Property | PropertyPath>;
            pathType: string;
        }
    }
}
export {};
