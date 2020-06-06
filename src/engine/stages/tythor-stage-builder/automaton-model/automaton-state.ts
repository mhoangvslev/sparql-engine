export class State {
    private _name: number
    private _isInitial: boolean
    private _isFinal: boolean

    constructor(name: number, isInitial: boolean, isFinal: boolean) {
        this._name = name
        this._isInitial = isInitial
        this._isFinal = isFinal
    }

    get name(): number {
        return this._name
    }

    get isInitial(): boolean {
        return this._isInitial
    }

    get isFinal(): boolean {
        return this._isFinal
    }

    set isFinal(isFinal: boolean) {
        this._isFinal = isFinal
    }

    public print(marginLeft: number = 0): void {
        console.log(`${" ".repeat(marginLeft)}> State{name: ${this.name}, isInitial: ${this.isInitial}, isFinal: ${this.isFinal}}`)
    }

    public equals(other: State): boolean {
        return this.name === other.name 
            && this.isInitial === other.isInitial
            && this.isFinal === other.isFinal
    }
}