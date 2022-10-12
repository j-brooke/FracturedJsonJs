/**
 * Instructions on what to do about comments found in the input text.  According to the JSON standard, comments
 * aren't allowed.  But "JSON with comments" is pretty wide-spread these days, thanks largely to Microsoft,
 * so it's nice to have options.
 */
export enum CommentPolicy
{
    /**
     * An exception will be thrown if comments are found in the input.
     */
    TreatAsError,

    /**
     * Comments are allowed in the input, but won't be included in the output.
     */
    Remove,

    /**
     * Comments found in the input should be included in the output.
     */
    Preserve,
}