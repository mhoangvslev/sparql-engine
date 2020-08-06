/**
 * @author Julien Aimonier-Davat
 */
export declare class State {
    private _name;
    private _isInitial;
    private _isFinal;
    constructor(name: number, isInitial: boolean, isFinal: boolean);
    get name(): number;
    get isInitial(): boolean;
    get isFinal(): boolean;
    set isFinal(isFinal: boolean);
    print(marginLeft?: number): void;
    equals(other: State): boolean;
}
