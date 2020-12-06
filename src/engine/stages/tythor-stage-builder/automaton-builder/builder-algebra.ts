declare module "sparqljs" {
    export namespace TythorAlgebra {

        export interface Node {
            id?: number
            type: string
            nullable: boolean
            first: Set<number>
            last: Set<number>
            follow: Set<number>
        }

        export interface Property extends Node {
            items: string[]
            negation: boolean
            inverse: boolean
        }

        export interface Closure extends Node {
            expression: Algebra.PropertyPath
        }

        export interface PropertyPath extends Omit<Algebra.PropertyPath, 'items'>, Node {
            items: Array<string | Property | PropertyPath | Closure>
            pathType: string
        }
    }
}