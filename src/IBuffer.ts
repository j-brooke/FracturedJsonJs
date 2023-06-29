/**
 * A place where strings are piled up sequentially to eventually make one big string.  Or maybe straight to a
 * stream or whatever.
 */
export interface IBuffer {
    Add(...values: string[]): IBuffer;
    EndLine(eolString: string): IBuffer;
    Flush(): IBuffer;
}
