import { TythorAlgebra, Algebra } from 'sparqljs'
import { cloneDeep } from 'lodash'
import { Automaton } from '../automaton-model/automaton'
import { State } from '../automaton-model/state'
import { isNode, isPathNode, isPropertyNode, isClosureNode } from '../utils'
import { PropertyTransition } from '../automaton-model/property-transition'
import { Instruction } from '../automaton-model/instruction'
import { TransitiveTransition } from '../automaton-model/transitive-transition'

function union(setA: Set<number>, setB: Set<number>): Set<number> {
    let union: Set<number> = new Set(setA);
    setB.forEach((value) => {
        union.add(value);
    });
    return union;
}

/**
 * @author Julien Aimonier-Davat
 */
class GlushkovAutomatonBuilder {

    private syntaxTree: TythorAlgebra.PropertyPath
    private properties: Map<number, TythorAlgebra.Node>

    constructor(syntaxTree: TythorAlgebra.PropertyPath) {
        this.syntaxTree = syntaxTree
        this.properties = new Map<number, TythorAlgebra.Node>()
    }

    private visitProperty(node: TythorAlgebra.Property) {
        let nodeID: number = node.id!
        node.first.add(nodeID)
        node.last.add(nodeID)
        this.properties.set(nodeID, node)
    }

    private visitClosure(node: TythorAlgebra.Closure) {
        let nodeID: number = node.id!
        node.first.add(nodeID)
        node.last.add(nodeID)
        this.properties.set(nodeID, node)
    }

    private visitSequenceExpression(node: TythorAlgebra.PropertyPath): void {
        node.nullable = true
        for (let child of (node.items as TythorAlgebra.Node[])) {
            node.nullable = node.nullable && child.nullable
        }
        let index: number = -1
        let child: TythorAlgebra.Node
        do {
            index++
            child = node.items[index] as TythorAlgebra.Node
            node.first = union(node.first, child.first)
        } while (index < node.items.length - 1 && child.nullable)

        index = node.items.length
        do {
            index--
            child = node.items[index] as TythorAlgebra.Node
            node.last = union(node.last, child.last)
        } while (index > 0 && child.nullable)

        for (let i = 0; i < node.items.length - 1; i++) {
            child = node.items[i] as TythorAlgebra.Node
            for (let value of child.last) {
                let lastOfChild: TythorAlgebra.Node = this.properties.get(value)!
                let suiv: number = i
                let nextChild: TythorAlgebra.Node
                do {
                    suiv++
                    nextChild = node.items[suiv] as TythorAlgebra.Node
                    lastOfChild.follow = union(lastOfChild.follow, nextChild.first)
                } while (suiv < node.items.length - 1 && nextChild.nullable)
            }
        }
    }

    private visitAlternativeExpression(node: TythorAlgebra.PropertyPath) {
        for (let child of (node.items as TythorAlgebra.Node[])) {
            node.nullable = node.nullable || child.nullable
            node.first = union(node.first, child.first)
            node.last = union(node.last, child.last)
        }
    }

    private visitOneOrMoreExpression(node: TythorAlgebra.PropertyPath) {
        let child = node.items[0] as TythorAlgebra.Node
        node.nullable = child.nullable
        node.first = child.first
        node.last = child.last

        for (let childLastID of child.last) {
            let childLast = this.properties.get(childLastID) as TythorAlgebra.Node
            childLast.follow = union(childLast.follow, child.first)
        }
    }

    private visitZeroOrOneExpression(node: TythorAlgebra.PropertyPath) {
        let child = node.items[0] as TythorAlgebra.Node
        node.nullable = true
        node.first = child.first
        node.last = child.last
    }

    private visitZeroOrMoreExpression(node: TythorAlgebra.PropertyPath) {
        let child = node.items[0] as TythorAlgebra.Node
        node.nullable = true
        node.first = child.first
        node.last = child.last

        for (let childLastID of child.last) {
            let childLast = this.properties.get(childLastID) as TythorAlgebra.Node
            childLast.follow = union(childLast.follow, child.first)
        }
    }

    private visitInverseExpression(node: TythorAlgebra.PropertyPath) {
        let child = node.items[0] as TythorAlgebra.Node
        node.nullable = child.nullable
        node.first = child.first
        node.last = child.last
    }

    private visitPath(node: TythorAlgebra.PropertyPath) {
        switch(node.pathType) {
            case '/':
                this.visitSequenceExpression(node)
                break
            case '|':
                this.visitAlternativeExpression(node)
                break
            case '+':
                this.visitOneOrMoreExpression(node)
                break
            case '?':
                this.visitZeroOrOneExpression(node)
                break
            case '*':
                this.visitZeroOrMoreExpression(node)
                break
            case '^':
                this.visitInverseExpression(node)
                break
        }
    }

    private visitNode(node: TythorAlgebra.Node) {
        switch (node.type) {
            case "property":
                this.visitProperty(node as TythorAlgebra.Property)
                break
            case "path":
                this.visitPath(node as TythorAlgebra.PropertyPath)
                break
            case "closure":
                this.visitClosure(node as TythorAlgebra.Closure)
                break
        }
    }

    private visit(node: TythorAlgebra.Node) {
        if (isPathNode(node)) {
            for (let child of node.items) {
                if (isNode(child)) {
                    this.visit(child)
                }
            }
        }
        this.visitNode(node)
    }

    public build(nested: boolean = false): Automaton<PropertyTransition> {
        // Creates the automaton
        let automaton = new Automaton<PropertyTransition>()
        let root = this.syntaxTree
        
        // Computes the metrics that will be used to build the automaton
        this.properties.clear()
        this.visit(root)

        // Creates and adds the initial state
        let initialState = new State(0, true, root.nullable && !nested)
        automaton.addState(initialState)

        // Creates and adds the other states
        for (let [_, node] of this.properties.entries()) {
            if (!automaton.findState(node.id!)) {
                let isFinal = root.last.has(node.id!)
                automaton.addState(new State(node.id!, false, isFinal))
            }   
        }

        // Adds the transitions that start from the initial state
        for (let value of root.first) {            
            let toNode: TythorAlgebra.Node = this.properties.get(value)!
            let toState: State = automaton.findState(toNode.id!)!
            if (isPropertyNode(toNode)) {
                let instruction = new Instruction(toNode.items, toNode.inverse, toNode.negation)
                let transition = new PropertyTransition(initialState, toState, instruction)
                automaton.addTransition(transition)
            } else {
                throw new Error(`Unknown node encountered during automaton construction`)
            }
        }

        // Adds the transitions between states
        for (let from of Array.from(this.properties.keys())) {
            let fromNode: TythorAlgebra.Node = this.properties.get(from)!
            for (let to of fromNode.follow) {
                let fromState: State = automaton.findState(fromNode.id!)!
                let toNode: TythorAlgebra.Node = this.properties.get(to)!
                let toState: State = automaton.findState(toNode.id!)!
                if (isPropertyNode(toNode)) {
                    let instruction = new Instruction(toNode.items, toNode.inverse, toNode.negation)
                    let transition = new PropertyTransition(fromState, toState, instruction)
                    automaton.addTransition(transition)
                } else if (isClosureNode(toNode)) {
                    let transition = new TransitiveTransition(fromState, toState, toNode.expression)
                    automaton.addTransition(transition)
                } else {
                    throw new Error(`Unknown node encountered during automaton construction`)
                } 
            }
        }
        return automaton
    }
}

/**
 * @author Julien Aimonier-Davat
 */
export class AutomatonBuilder {

    private rewriteNegations(node: TythorAlgebra.PropertyPath) {
        for (let child of node.items) {
            if (isPathNode(child)) {
                this.rewriteNegations(child)
            }
        }
        if (node.pathType === "!") {
            this.rewriteNegation(node)
        }
    }

    private addNodesIdentifiers(node: TythorAlgebra.Node, counter: number = 1): number {
        if (isPathNode(node)) {
            for (let child of node.items) {
                if (isNode(child)) {
                    counter = this.addNodesIdentifiers(child, counter)
                }
            }
        }
        node.id = counter++
        return counter
    }

    private initializeTree(node: TythorAlgebra.Node) {
        node.first = new Set<number>()
        node.last = new Set<number>()
        node.follow = new Set<number>()
        node.nullable = false
        if (isPathNode(node)) {
            for (let [index, child] of node.items.entries()) {
                if (typeof child === "string") {
                    let property: TythorAlgebra.Property = {
                        items: [child],
                        negation: false,
                        inverse: false,
                        nullable: false,
                        first: new Set<number>(),
                        last: new Set<number>(),
                        follow: new Set<number>(),
                        type: "property"
                    }
                    node.items[index] = property
                } else {
                    this.initializeTree(child)
                }
            }
        }
    }

    private rewriteNegation(node: TythorAlgebra.PropertyPath) {
        let forwardProperties = new Array<string>()
        let backwardProperties = new Array<string>()

        function visitChild(pathNode: TythorAlgebra.PropertyPath) {
            for (let child of pathNode.items) {
                if (isPropertyNode(child)) {
                    if (child.inverse) {
                        backwardProperties.push(...child.items)
                    } else {
                        forwardProperties.push(...child.items)
                    }
                } else if (isPathNode(child)) {
                    visitChild(child)
                }
            }
        }

        visitChild(node)

        node.pathType = "|"
        node.items = new Array<TythorAlgebra.Property>()

        if (backwardProperties.length > 0) {
            let backwardNode: TythorAlgebra.Property = {
                items: backwardProperties,
                negation: true,
                inverse: true,
                nullable: false,
                first: new Set<number>(),
                last: new Set<number>(),
                follow: new Set<number>(),
                type: "property"
            }
            node.items.push(backwardNode)
        }
        if (forwardProperties.length > 0) {
            let forwardNode: TythorAlgebra.Property = {
                items: forwardProperties,
                negation: true,
                inverse: false,
                nullable: false,
                first: new Set<number>(),
                last: new Set<number>(),
                follow: new Set<number>(),
                type: "property"
            }
            node.items.push(forwardNode)
        }
    }

    private pushDownInverses(node: TythorAlgebra.Node) {
        if (isPathNode(node)) {
            for (let child of node.items) {
                if (isNode(child)) {
                    this.pushDownInverses(child)
                }
            }
            if (node.pathType === '^') {
                this.inverseSequences(node)
                this.pushDownInverse(node)
            }
        }
    }
    
    private inverseSequences(node: TythorAlgebra.Node) {
        if (isPathNode(node)) {
            if (node.pathType === '/') {
                node.items = node.items.reverse()
            }
            for (let child of node.items) {
                if (isNode(child)) {
                    this.inverseSequences(child)
                }   
            }
        }
    }
    
    private pushDownInverse(node: TythorAlgebra.Node) {
        if (isPropertyNode(node)) {
            node.inverse = !node.inverse
        } else if (isPathNode(node)) {
            for (let child of node.items) {
                if (isNode(child)) {
                    this.pushDownInverse(child)
                }
            }
        }
    }
    
    private printTree(node: TythorAlgebra.Node | string, depth: number = 0) {
        node = node as TythorAlgebra.Node
        switch (node.type) {
            case "path":
                let path = node as TythorAlgebra.PropertyPath
                console.log(`${" ".repeat(depth)} > Path{id: ${path.id}, pathType: ${path.pathType}}`)
                for(let i = 0; i < path.items.length; i++) {
                    this.printTree(path.items[i], depth + 3)
                }
                break
            case "property":
                let property = node as TythorAlgebra.Property
                console.log(`${" ".repeat(depth)} > Property{id: ${property.id}, 
                    items: ${property.items}, 
                    negation: ${property.negation}, 
                    inverse: ${property.inverse},
                    nullable: ${property.nullable},
                    first: ${property.first},
                    last: ${property.last},
                    follow: ${property.follow}}`)
                break
            case "closure":
                let closure = node as TythorAlgebra.Closure
                console.log(`${" ".repeat(depth)} > Closure{id: ${closure.id}, 
                    nullable: ${closure.nullable},
                    first: ${closure.first},
                    last: ${closure.last},
                    follow: ${closure.follow}}`)
                break
            default:
                break
        }
    }

    private buildNestedAutomaton(node: TythorAlgebra.Node) {
        if (isPathNode(node)) {
            for (let [index, child] of node.items.entries()) {
                if (isNode(child)) {
                    this.buildNestedAutomaton(child)
                }
                if (isPathNode(child) && ['*', '+', '?'].includes(child.pathType)) {
                    let closure: TythorAlgebra.Closure = {
                        expression: child as Algebra.PropertyPath,
                        first: new Set<number>(),
                        last: new Set<number>(),
                        follow: new Set<number>(),
                        type: 'closure',
                        nullable: false
                    }
                    node.items[index] = closure
                }
            }
        }
    }

    private buildAutomaton(node: TythorAlgebra.PropertyPath) {
        this.buildNestedAutomaton(node)
        this.addNodesIdentifiers(node)
        if (isPathNode(node) && ['*', '+', '?'].includes(node.pathType)) {
            let baseAutomaton = new Automaton<PropertyTransition>()
            let initialState = new State(0, true, false)
            let finalState = new State(1, false, true)
            baseAutomaton.addState(initialState)
            baseAutomaton.addState(finalState)
            baseAutomaton.addTransition(new TransitiveTransition(initialState, finalState, node as Algebra.PropertyPath))
            return baseAutomaton
        }
        return new GlushkovAutomatonBuilder(node).build()
    }

    public build(propertyPath: TythorAlgebra.PropertyPath, forward: boolean): Automaton<PropertyTransition> {
        let syntaxTree = cloneDeep(propertyPath)
        this.initializeTree(syntaxTree)
        if (!forward) {
            this.inverseSequences(syntaxTree)
            this.pushDownInverse(syntaxTree)
        }
        this.pushDownInverses(syntaxTree)
        this.rewriteNegations(syntaxTree)
        return this.buildAutomaton(syntaxTree)
    }
}