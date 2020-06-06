import { Algebra } from "sparqljs";
import { Automaton } from "../automaton-model/automaton";

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

        // export interface Kleene extends Node {
        //     automaton: Automaton
        // }

        export interface PropertyPath extends Omit<Algebra.PropertyPath, 'items'>, Node {
            items: Array<string | Property | PropertyPath /*| Kleene*/>
            pathType: string
        }
    }
}