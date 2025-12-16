import {EolStyle} from "./EolStyle";
import {CommentPolicy} from "./CommentPolicy";
import {NumberListAlignment} from "./NumberListAlignment";
import {TableCommaPlacement} from "./TableCommaPlacement";

/**
 * Settings controlling the output of FracturedJson-formatted JSON documents.
 * Note that the constructor will give defaults that with stable behavior within all releases with the same major
 * version number.  If new features are added in a minor version release, you can use the static factory method
 * FracturedJsonOptions.Recommended() (instead of new) to get the most up-to-date preferred behavior.  This might not
 * be backward compatible, though.
 */
export class FracturedJsonOptions
{
    /**
     * Specifies the line break style (e.g., LF or CRLF) for the formatted JSON output. EolStyle
     * for options.
     */
    JsonEolStyle: EolStyle = EolStyle.Lf;

    /**
     * Maximum length (in characters, including indentation) when more than one simple value is put on a line.
     * individual values (e.g., long strings) may exceed this limit.
     */
    MaxTotalLineLength: number = 120;

    /**
     * Maximum nesting level of arrays/objects that may be written on a single line.  0 disables inlining (but see
     * related settings).  1 allows inlining of arrays/objects that contain only simple items.  2 allows inlining of
     * arrays/objects that contain other arrays/objects as long as the child containers only contain simple items.
     * Higher values allow deeper nesting.
     */
    MaxInlineComplexity: number = 2;

    /**
     *  Maximum nesting level for arrays formatted with multiple items per row across multiple lines. Set to 0 to
     *  disable this format.  1 allows arrays containing only simple values to be formatted this way.  2 allows arrays
     *  containing arrays or elements that contain only simple values.  Higher values allow deeper nesting.
     */
    MaxCompactArrayComplexity: number = 2;

    /**
     * Maximum nesting level of the rows of an array or object formatted as a table with aligned columns.  When set
     * to 0, the rows may only be simple values and there will only be one column.  When set to 1, each row can be
     * an array or object containing only simple values.  Higher values allow deeper nesting.
     */
    MaxTableRowComplexity:number = 2;

    /**
     * Maximum length difference between property names in an object to align them vertically in expanded (non-table)
     * formatting.
     */
    MaxPropNamePadding:number = 16;

    /**
     * If true, colons in aligned object properties are placed right after the property name (e.g., 'name:    value');
     * if false, colons align vertically after padding (e.g., 'name   : value'). Applies to table and expanded
     * formatting.
     */
    ColonBeforePropNamePadding:boolean = false;

    /**
     * Determines whether commas in table-formatted rows are lined up in their own column after padding or placed
     * directly after each element, before padding spaces.
     */
    TableCommaPlacement: TableCommaPlacement = TableCommaPlacement.BeforePaddingExceptNumbers;

    /**
     * Minimum items per row to format an array with multiple items per line across multiple lines.  This is a
     * guideline, not a strict rule.
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
     *
     * Example: <br/>
     * true: [ [ 1, 2, 3 ], [ 4 ] ] <br/>
     * false: [ [1, 2, 3], [4] ] <br/>
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
     * If true, spaces are included between JSON data and comments that precede or follow them on the same line.
     */
    CommentPadding: boolean = true;

    /**
     * Controls alignment of numbers in table columns or compact multiline arrays.  When set to
     * NumberListAlignment.Normalize, numbers are rewritten to have the same decimal precision as others
     * in the same column.  Other settings preserve input numbers exactly.
     */
    NumberListAlignment: NumberListAlignment = NumberListAlignment.Decimal;

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
     * If true, allows a comma after the last element in arrays or objects, which is non-standard JSON but supported
     * by some systems.
     */
    AllowTrailingCommas: boolean = false;

    /**
     * Creates a new FracturedJsonOptions with recommended settings, prioritizing sensible defaults
     * over backward compatibility. Constructor defaults maintain consistent behavior across minor versions, while
     * this method may adopt newer, preferred settings.
     */
    static Recommended(): FracturedJsonOptions {
        // At the beginning of version 5, the defaults are the recommended settings.  This may change in future
        // minor versions.
        return new FracturedJsonOptions();
    }
}
