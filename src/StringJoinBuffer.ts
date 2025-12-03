import {IBuffer} from "./IBuffer";

/**
 * A place where strings are piled up sequentially to eventually make one big string.
 */
export class StringJoinBuffer implements IBuffer {
    /**
     * Add zero or more strings to the buffer.
     */
    Add(...values: string[]): IBuffer {
        this._lineBuff.push(...values);
        return this;
    }

    /**
     * Add the requested number of spaces.
     */
    Spaces(count: number): IBuffer {
        // TODO: Experiment for most efficient approach
        for (let i = 0; i < count; ++i)
            this._lineBuff.push(' ');

        return this;
    }

    /**
     * Used to indicate the end of a line.  Triggers special processing like trimming whitespace.
     */
    EndLine(eolString: string): IBuffer {
        this.AddLineToWriter(eolString);
        return this;
    }

    /**
     * Call this to let the buffer finish up any work in progress.
     */
    Flush(): IBuffer {
        this.AddLineToWriter("");
        return this;
    }

    /**
     * Converts the buffer's contents into a single string.
     */
    AsString(): string {
        // I experimented with a few approaches to try to make this faster, but none of them made much difference
        // for an 8MB file.  Turns out Array.join is really quite good.
        return this._docBuff.join("");
    }

    private _lineBuff: string[] = [];
    private readonly _docBuff: string[] = [];

    /**
     * Takes the contents of _lineBuff and merges them into a string and adds it to _docBuff.  If desired,
     * we trim trailing whitespace in the process.
     */
    private AddLineToWriter(eolString: string): void {
        if (this._lineBuff.length===0 && eolString.length===0)
            return;

        let line = this._lineBuff.join("").trimEnd();

        this._docBuff.push(line + eolString);
        this._lineBuff = [];
    }
}
