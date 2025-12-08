/**
 * A place where strings are piled up sequentially to eventually make one big string.  Or maybe straight to a
 * stream or whatever.
 */
export interface IBuffer {
    /**
     * Add zero or more strings to the buffer.
     */
    Add(...values: string[]): IBuffer;

    /**
     * Add the requested number of spaces.
     */
    Spaces(count: number): IBuffer;

    /**
     * Used to indicate the end of a line.  Triggers special processing like trimming whitespace.
     */
    EndLine(eolString: string): IBuffer;

    /**
     * Call this to let the buffer finish up any work in progress.
     */
    Flush(): IBuffer;
}
