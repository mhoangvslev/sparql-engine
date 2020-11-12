import { BuilderAlgebra } from 'sparqljs'
import { cloneDeep, intersection, difference } from 'lodash'
import { Automaton } from '../automaton-model/automaton'
import { State } from '../automaton-model/state'
import { isNode, isPathNode, isPropertyNode,/*, isTransitiveNode*/ 
isClosureNode} from '../utils'
import { PropertyTransition } from '../automaton-model/property-transition'
import { Instruction } from '../automaton-model/instruction'
import { concatMap } from 'rxjs/operators'
import { ClosureTransition } from '../automaton-model/closure-transition'

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

    private syntaxTree: BuilderAlgebra.PropertyPath
    private properties: Map<number, BuilderAlgebra.Node>

    constructor(syntaxTree: BuilderAlgebra.PropertyPath) {
        this.syntaxTree = syntaxTree
        this.properties = new Map<number, BuilderAlgebra.Node>()
    }

    private visitProperty(node: BuilderAlgebra.Property) {
        let nodeID: number = node.id!
        node.first.add(nodeID)
        node.last.add(nodeID)
        this.properties.set(nodeID, node)
    }

    private visitClosure(node: BuilderAlgebra.Closure) {
        let nodeID: number = node.id!
        node.first.add(nodeID)
        node.last.add(nodeID)
        this.properties.set(nodeID, node)
    }

    private visitSequenceExpression(node: BuilderAlgebra.PropertyPath): void {
        node.nullable = true
        for (let child of (node.items as BuilderAlgebra.Node[])) {
            node.nullable = node.nullable && child.nullable
        }
        let index: number = -1
        let child: BuilderAlgebra.Node
        do {
            index++
            child = node.items[index] as BuilderAlgebra.Node
            node.first = union(node.first, child.first)
        } while (index < node.items.length - 1 && child.nullable)

        index = node.items.length
        do {
            index--
            child = node.items[index] as BuilderAlgebra.Node
            node.last = union(node.last, child.last)
        } while (index > 0 && child.nullable)

        for (let i = 0; i < node.items.length - 1; i++) {
            child = node.items[i] as BuilderAlgebra.Node
            for (let value of child.last) {
                let lastOfChild: BuilderAlgebra.Node = this.properties.get(value)!
                let suiv: number = i
                let nextChild: BuilderAlgebra.Node
                do {
                    suiv++
                    nextChild = node.items[suiv] as BuilderAlgebra.Node
                    lastOfChild.follow = union(lastOfChild.follow, nextChild.first)
                } while (suiv < node.items.length - 1 && nextChild.nullable)
            }
        }
    }

    private visitAlternativeExpression(node: BuilderAlgebra.PropertyPath) {
        for (let child of (node.items as BuilderAlgebra.Node[])) {
            node.nullable = node.nullable || child.nullable
            node.first = union(node.first, child.first)
            node.last = union(node.last, child.last)
        }
    }

    private visitOneOrMoreExpression(node: BuilderAlgebra.PropertyPath) {
        let child = node.items[0] as BuilderAlgebra.Node
        node.nullable = child.nullable
        node.first = child.first
        node.last = child.last

        for (let childLastID of child.last) {
            let childLast = this.properties.get(childLastID) as BuilderAlgebra.Node
            childLast.follow = union(childLast.follow, child.first)
        }
    }

    private visitZeroOrOneExpression(node: BuilderAlgebra.PropertyPath) {
        let child = node.items[0] as BuilderAlgebra.Node
        node.nullable = true
        node.first = child.first
        node.last = child.last
    }

    private visitZeroOrMoreExpression(node: BuilderAlgebra.PropertyPath) {
        let child = node.items[0] as BuilderAlgebra.Node
        node.nullable = true
        node.first = child.first
        node.last = child.last

        for (let childLastID of child.last) {
            let childLast = this.properties.get(childLastID) as BuilderAlgebra.Node
            childLast.follow = union(childLast.follow, child.first)
        }
    }

    private visitInverseExpression(node: BuilderAlgebra.PropertyPath) {
        let child = node.items[0] as BuilderAlgebra.Node
        node.nullable = child.nullable
        node.first = child.first
        node.last = child.last
    }

    private visitPath(node: BuilderAlgebra.PropertyPath) {
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

    private visitNode(node: BuilderAlgebra.Node) {
        switch (node.type) {
            case "property":
                this.visitProperty(node as BuilderAlgebra.Property)
                break
            case "path":
                this.visitPath(node as BuilderAlgebra.PropertyPath)
                break
            case "closure":
                this.visitClosure(node as BuilderAlgebra.Closure)
                break
        }
    }

    private visit(node: BuilderAlgebra.Node) {
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
            let toNode: BuilderAlgebra.Node = this.properties.get(value)!
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
            let fromNode: BuilderAlgebra.Node = this.properties.get(from)!
            for (let to of fromNode.follow) {
                let fromState: State = automaton.findState(fromNode.id!)!
                let toNode: BuilderAlgebra.Node = this.properties.get(to)!
                let toState: State = automaton.findState(toNode.id!)!
                if (isPropertyNode(toNode)) {
                    let instruction = new Instruction(toNode.items, toNode.inverse, toNode.negation)
                    let transition = new PropertyTransition(fromState, toState, instruction)
                    automaton.addTransition(transition)
                } else if (isClosureNode(toNode)) {
                    let transition = new ClosureTransition(fromState, toState, toNode.automaton)
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

    private rewriteNegations(node: BuilderAlgebra.PropertyPath) {
        for (let child of node.items) {
            if (isPathNode(child)) {
                this.rewriteNegations(child)
            }
        }
        if (node.pathType === "!") {
            this.rewriteNegation(node)
        }
    }

    private addNodesIdentifiers(node: BuilderAlgebra.Node, counter: number = 1): number {
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

    private initializeTree(node: BuilderAlgebra.Node) {
        node.first = new Set<number>()
        node.last = new Set<number>()
        node.follow = new Set<number>()
        node.nullable = false
        if (isPathNode(node)) {
            for (let [index, child] of node.items.entries()) {
                if (typeof child === "string") {
                    let property: BuilderAlgebra.Property = {
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

    private rewriteNegation(node: BuilderAlgebra.PropertyPath) {
        let forwardProperties = new Array<string>()
        let backwardProperties = new Array<string>()

        function visitChild(pathNode: BuilderAlgebra.PropertyPath) {
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
        node.items = new Array<BuilderAlgebra.Property>()

        if (backwardProperties.length > 0) {
            let backwardNode: BuilderAlgebra.Property = {
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
            let forwardNode: BuilderAlgebra.Property = {
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

    private pushDownInverses(node: BuilderAlgebra.Node) {
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
    
    private inverseSequences(node: BuilderAlgebra.Node) {
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
    
    private pushDownInverse(node: BuilderAlgebra.Node) {
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
    
    private printTree(node: BuilderAlgebra.Node | string, depth: number = 0) {
        node = node as BuilderAlgebra.Node
        switch (node.type) {
            case "path":
                let path = node as BuilderAlgebra.PropertyPath
                console.log(`${" ".repeat(depth)} > Path{id: ${path.id}, pathType: ${path.pathType}}`)
                for(let i = 0; i < path.items.length; i++) {
                    this.printTree(path.items[i], depth + 3)
                }
                break
            case "property":
                let property = node as BuilderAlgebra.Property
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
                let closure = node as BuilderAlgebra.Closure
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

    private buildNestedAutomaton(node: BuilderAlgebra.Node) {
        if (isPathNode(node)) {
            for (let [index, child] of node.items.entries()) {
                if (isNode(child)) {
                    this.buildNestedAutomaton(child)
                }
                if (isPathNode(child) && ['*', '+', '?'].includes(child.pathType)) {
                    this.addNodesIdentifiers(child)
                    let automaton = new GlushkovAutomatonBuilder(child).build(true)
                    let closure: BuilderAlgebra.Closure = {
                        automaton: automaton,
                        first: new Set<number>(),
                        last: new Set<number>(),
                        follow: new Set<number>(),
                        type: 'closure',
                        nullable: child.pathType == '*' || child.pathType == '?'
                    }
                    node.items[index] = closure
                }
            }
        }
    }

    private buildAutomaton(node: BuilderAlgebra.PropertyPath) {
        this.buildNestedAutomaton(node)
        this.addNodesIdentifiers(node)
        if (isPathNode(node) && ['*', '+', '?'].includes(node.pathType)) {
            let baseAutomaton = new Automaton<PropertyTransition>()
            let initialState = new State(0, true, ['*', '?'].includes(node.pathType))
            let finalState = new State(1, false, true)
            let closureAutomaton = new GlushkovAutomatonBuilder(node).build(true)
            baseAutomaton.addState(initialState)
            baseAutomaton.addState(finalState)
            baseAutomaton.addTransition(new ClosureTransition(initialState, finalState, closureAutomaton))
            return baseAutomaton
        }
        return new GlushkovAutomatonBuilder(node).build()
    }

    public build(propertyPath: BuilderAlgebra.PropertyPath, forward: boolean): Automaton<PropertyTransition> {
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