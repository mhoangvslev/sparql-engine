import { Algebra } from "sparqljs"
import { Automaton } from "../automaton-model/automaton"
import { PropertyTransition } from "../automaton-model/property-transition"

declare module "sparqljs" {
    export namespace BuilderAlgebra {

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
            automaton: Automaton<PropertyTransition>
        }

        export interface PropertyPath extends Omit<Algebra.PropertyPath, 'items'>, Node {
            items: Array<string | Property | PropertyPath | Closure>
            pathType: string
        }
    }
}