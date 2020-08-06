/**
 * @author Julien Aimonier-Davat
 */
export declare class TythorContext {
    private _subject;
    private _object;
    private _visited;
    private _stop;
    private _solution;
    constructor(subject: string, object: string);
    get subject(): string;
    get object(): string;
    get stop(): boolean;
    set stop(value: boolean);
    visited(subject: string, node: string): boolean;
    visit(subject: string, node: string): void;
    isSolution(subject: string, object: string): boolean;
}
