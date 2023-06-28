import {IBuffer} from "./IBuffer";

/**
 * A place where strings are piled up sequentially to eventually make one big string.
 */
export class StringJoinBuffer implements IBuffer {
    constructor(trimTrailingWhitespace: boolean) {
        this._trimTrailingWhitespace = trimTrailingWhitespace;
    }
    Add(...values: string[]): IBuffer {
        this._lineBuff.push(...values);
        return this;
    }

    EndLine(eolString: string): IBuffer {
        this.AddLineToWriter(eolString);
        return this;
    }

    Flush(): IBuffer {
        this.AddLineToWriter("");
        return this;
    }

    AsString(): string {
        // I experimented with a few approaches to try to make this faster, but none of them made much difference
        // for an 8MB file.  Turns out Array.join is really quite good.
        return this._docBuff.join("");
    }

    private _lineBuff: string[] = [];
    private readonly _docBuff: string[] = [];
    private readonly _trimTrailingWhitespace: boolean;

    /**
     * Takes the contents of _lineBuff and merges them into a string and adds it to _docBuff.  If desired,
     * we trim trailing whitespace in the process.
     */
    private AddLineToWriter(eolString: string): void {
        if (this._lineBuff.length===0 && eolString.length===0)
            return;

        let line = this._lineBuff.join("");
        if (this._trimTrailingWhitespace)
            line = line.trimEnd();

        this._docBuff.push(line + eolString);
        this._lineBuff = [];
    }
}
