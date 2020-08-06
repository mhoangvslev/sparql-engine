/**
 * A state of the automaton
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
export declare class State<T> {
    private _name;
    private _isInitial;
    private _isFinal;
    /**
     * Constructor
     * @param name - Name of the State. Must be unique.
     * @param isInitial - True to construct an initial State, False otherwise
     * @param isFinal - True to construct a final State, False otherwise
     */
    constructor(name: T, isInitial: boolean, isFinal: boolean);
    /**
     * Get the name of the State
     * @return The name of the State
     */
    get name(): T;
    /**
     * Get the flag that indicates whether the state is an initial state
     * @return True if the State is an initial State, False otherwise
     */
    get isInitial(): boolean;
    /**
     * Get the flag that indicates whether the state is a final state
     * @return True if the State is a final State, False otherwise
     */
    get isFinal(): boolean;
    /**
     * Test if a name is equal to the name of the State
     * @param name - Name tested
     * @return True if the given name is equal to the name of the State, False otherwise
     */
    hasName(name: T): boolean;
    /**
     * Test if a State is equal to this State
     * i.e. All the fields of the State are equal to those of this State
     * @param state - State tested
     * @return True if the States are equal, False otherwise
     */
    equals(state: State<T>): boolean;
    toString(): string;
}
/**
 * A transition of the automaton
 */
export declare class Transition<T, P> {
    private _from;
    private _to;
    private _reverse;
    private _negation;
    private _predicates;
    /**
     * Constructor
     * @param from - State from which the transition starts
     * @param to - State to which the transition arrives
     * @param reverse - True if to go throught this transiton, we have to look for an incoming edge in the RDF graph,
     *                  False if to go throught this transition, we have to look for an outgoing edge in the RDF graph
     * @param negation - True if to go throught this transition, we have to look for an edge for which the label must be in the predicates array,
     *                   False if to go throught this transition, we have to look for an edge for which the label musn't be in the predicates array
     * @param predicates
     */
    constructor(from: State<T>, to: State<T>, reverse: boolean, negation: boolean, predicates: Array<P>);
    /**
     * Get the State from which the transition starts
     * @return The State from which the transition starts
     */
    get from(): State<T>;
    /**
     * Get the State to which the transition arrives
     * @return The State to which the transition arrives
     */
    get to(): State<T>;
    /**
     * Get the predicates
     * @return if negation == False then an array of length 1, else an array of length 1 or more
     */
    get predicates(): Array<P>;
    /**
     * Get the flag which indicates whether we have to look for an outgoing or an incoming edge in the RDF graph
     * @return The flag which indicates whether we have to look for an outgoing or an incoming edge in the RDF graph
     */
    get reverse(): boolean;
    /**
     * Get the flag which indicates whether the edge's label must or musn't be in the predicates array
     * @return The flag which indicates whether the edge's label must or musn't be in the predicates array
     */
    get negation(): boolean;
    hasPredicate(predicate: P): boolean;
    /**
     * Test if a Transition is equal to this Transition
     * i.e. All the fields of the Transition are equal to those of this Transition
     * @param transition - Transition tested
     * @return True if the Transitions are equal, False otherwise
     */
    equals(transition: Transition<T, P>): boolean;
    toString(): string;
}
/**
 * An Automaton is used to evaluate a SPARQL Property Path. SPARQL Property Paths are transformed into an
 * equivalent Automaton which are used as a guide to navigate throught the Graph. When we reach a final state
 * then we have found a Path in the Graph that matches the Property Path.
 */
export declare class Automaton<T, P> {
    private states;
    private transitions;
    /**
     * Constructor
     */
    constructor();
    /**
     * Return the State with the given name
     * @param name - Name of the State we're looking for
     * @return A State if there is a State with the given name, null otherwise
     */
    findState(name: T): State<T> | null;
    /**
     * Add a State to the Automaton
     * @param state - State to be added
     */
    addState(state: State<T>): void;
    /**
     * Add a Transition to the Automaton
     * @param transition - Transition to be added
     */
    addTransition(transition: Transition<T, P>): void;
    /**
     * Return the Transitions which start from the given State
     * @param from - State from which the Transitions we are looking for must start
     * @return Transitions which start from the given State
     */
    getTransitionsFrom(from: T): Array<Transition<T, P>>;
    /**
     * Return the Transitions which arrives to the given State
     * @param to - State to which the Transitions we are looking for must arrive
     * @return Transitions which arrives to the given State
     */
    getTransitionsTo(to: T): Array<Transition<T, P>>;
    /**
     * Return the Transitions which arrives to a final State
     * @return Transitions which arrives to a final State
     */
    getTransitionsToFinalStates(): Array<Transition<T, P>>;
    /**
     * Test if the State with the given name is an initial State
     * @param stateName - Name of the tested State
     * @return True if the State is an initial State, False otherwise
     */
    isInitial(stateName: T): boolean;
    /**
     * Test if the State with the given name is a final State
     * @param stateName - Name of the tested State
     * @return True if the State is a final State, False otherwise
     */
    isFinal(stateName: T): boolean;
    toString(): string;
}
