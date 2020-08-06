/**
 * @author Julien Aimonier-Davat
 */
export declare class Instruction {
    private _properties;
    private _inverse;
    private _negation;
    constructor(properties: string[], inverse: boolean, negation: boolean);
    get properties(): string[];
    get inverse(): boolean;
    get negation(): boolean;
    equals(other: Instruction): boolean;
}
