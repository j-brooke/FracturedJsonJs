import {IBuffer} from "./IBuffer";

/**
 * A place where strings are piled up sequentially to eventually make one big string.
 */
export class StringJoinBuffer implements IBuffer {
    Add(...values: string[]): void {
        this._buff.push(...values);
    }

    AsString(): string {
        // I experimented with a few approaches to try to make this faster, but none of them made much difference
        // for an 8MB file.  Turns out Array.join is really quite good.
        return this._buff.join("");
    }

    private _buff: string[] = [];
}
