import {EolStyle} from "./EolStyle";
import {CommentPolicy} from "./CommentPolicy";

export class FracturedJsonOptions
{
    /**
     * Dictates which characters to use for line breaks.
     */
    JsonEolStyle: EolStyle = EolStyle.Lf;

    /**
     * Maximum length that the formatter can use when combining complex elements into a single line.  This
     * includes comments, property names, etc. - everything except indentation and any PrefixString.  Note that
     * lines containing only a single element can exceed this: a long string, or an element with a long prefix
     * or postfix comment, for example.
     */
    MaxInlineLength: number = 2000000000;

    /**
     * Maximum length that the formatter can use when combining complex elements into a single line, from the start
     * of the line.  This is identical to MaxInlineLength except that this one DOES count indentation
     * and any PrefixString.
     */
    MaxTotalLineLength: number = 120;

    /**
     * Maximum degree of nesting of arrays/objects that may be written on a single line.  0 disables inlining (but see
     * related settings).  1 allows inlining of arrays/objects that contain only simple items.  2 allows inlining of
     * arrays/objects that contain other arrays/objects as long as the child containers only contain simple items.  Etc.
     */
    MaxInlineComplexity: number = 2;

    /**
     * Maximum degree of nesting of arrays formatted as with multiple items per row across multiple rows.
     */
    MaxCompactArrayComplexity: number = 1;

    /**
     * Maximum degree of nesting of arrays/objects formatted as table rows.
     */
    MaxTableRowComplexity:number = 2;

    /**
     * Minimum number of items allowed per row to format an array as with multiple items per line across multiple
     * lines.  This is an approximation, not a hard rule.  The idea is that if there will be too few items per row,
     * you'd probably rather see it as a table.
     */
    MinCompactArrayRowItems: number = 3;

    /**
     * Depth at which lists/objects are always fully expanded, regardless of other settings.
     * -1 = none; 0 = root node only; 1 = root node and its children.
     */
    AlwaysExpandDepth: number = -1;

    /**
     * If an inlined array or object contains other arrays or objects, setting NestedBracketPadding to true
     * will include spaces inside the outer brackets.
     */
    NestedBracketPadding: boolean =  true;

    /**
     * If an inlined array or object does NOT contain other arrays/objects, setting SimpleBracketPadding to true
     * will include spaces inside the brackets.
     */
    SimpleBracketPadding: boolean = false;

    /**
     * If true, includes a space after property colons.
     */
    ColonPadding: boolean = true;

    /**
     * If true, includes a space after commas separating array items and object properties.
     */
    CommaPadding: boolean = true;

    /**
     * If true, spaces are included between prefix and postfix comments and their content.
     */
    CommentPadding: boolean = true;

    /**
     * If true, numbers won't be right-aligned with matching precision.
     */
    DontJustifyNumbers: boolean = false;

    /**
     * Number of spaces to use per indent level.  If UseTabToIndent is true, spaces won't be used but
     * this number will still be used in length computations.
     */
    IndentSpaces: number = 4;

    /**
     * Uses a single tab per indent level, instead of spaces.
     */
    UseTabToIndent: boolean = false;

    /**
     * String attached to the beginning of every line, before regular indentation.  If this string contains anything
     * other than whitespace, this will probably make the output invalid JSON, but it might be useful for output
     * to documentation, for instance.
     */
    PrefixString: string = "";

    /**
     * Determines how the parser and formatter should treat comments.  The JSON standard does not allow comments,
     * but it's a common unofficial extension.  (Such files are often given the extension ".jsonc".)
     */
    CommentPolicy: CommentPolicy = CommentPolicy.TreatAsError;

    /**
     * If true, blank lines in the original input should be preserved in the output.
     */
    PreserveBlankLines: boolean = false;

    /**
     * If true, arrays and objects that contain a comma after their last element are permitting.  The JSON standard
     * does not allow commas after the final element of an array or object, but some systems permit it, so
     * it's nice to have the option here.
     */
    AllowTrailingCommas: boolean = false;
}
