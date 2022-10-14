import {IBuffer} from "./IBuffer";

/**
 * A place where strings are piled up sequentially to eventually make one big string.
 */
export class StringBuilderBuffer implements IBuffer {
    Add(...values: string[]): void {
        this._buff.push(...values);
    }

    AsString(): string {
        return this._buff.join("");
    }

    private _buff: string[] = [];
}
