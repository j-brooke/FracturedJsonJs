/**
 * Collects spacing information about the columns of a potential table.  Each TableTemplate corresponds to
 * a part of a row, and they're nested recursively to match the JSON structure.  (Also used in complex multiline
 * arrays to try to fit them all nicely together.)
 *
 * Say you have an object/array where each item would make a nice row all by itself.  We want to try to line up
 * everything about it - comments, prop names, values.  If the row items are themselves objects/arrays, ideally
 * we'd like to line up all of their children, too, recursively.  This only works as long as the structure/types
 * are consistent.
 */
import {JsonItemType} from "./JsonItemType";
import {BracketPaddingType} from "./BracketPaddingType";
import {PaddedFormattingTokens} from "./PaddedFormattingTokens";
import {JsonItem} from "./JsonItem";
import {NumberListAlignment} from "./NumberListAlignment";
import {IBuffer} from "./IBuffer";
import {TableColumnType} from "./TableColumnType";

export class TableTemplate {
    /**
     * The property name in the table that this segment matches up with.
     */
    LocationInParent: string | undefined = undefined;

    /**
     * Type of the column, for table formatting purposes.  Numbers have special options.  Arrays or objects can
     * have recursive sub-columns.  If they're other simple types or if there's a mix of types, we basically
     * treat them as strings (no recursion).
     */
    Type: TableColumnType = TableColumnType.Unknown;
    RowCount: number = 0;

    /**
     * Length of the longest property name.
     */
    NameLength: number = 0;

    /**
     * Length of the shortest property name.
     */
    NameMinimum: number = Number.MAX_SAFE_INTEGER;

    /**
     * Largest length for the value parts of the column, not counting any table formatting padding.
     */
    MaxValueLength: number = 0;

    /**
     * Length of the largest value that can't be split apart; i.e., values other than arrays and objects.
     */
    MaxAtomicValueLength: number = 0;

    PrefixCommentLength: number = 0;
    MiddleCommentLength: number = 0;
    AnyMiddleCommentHasNewline: boolean = false;
    PostfixCommentLength: number = 0;
    IsAnyPostCommentLineStyle: boolean = false;
    PadType: BracketPaddingType = BracketPaddingType.Simple;
    RequiresMultipleLines: boolean = false;

    /**
     * Length of the value for this template when things are complicated.  For arrays and objects, it's the sum of
     * all the child templates' lengths, plus brackets and commas and such.  For number lists, it's the space
     * required to align them as appropriate.
     */
    CompositeValueLength: number = 0;

    /**
     * Length of the entire template, including space for the value, property name, and all comments.
     */
    TotalLength: number = 0;

    /**
     * If the row contains non-empty array or objects whose value is shorter than the literal null, an extra adjustment
     * is needed.
     */
    ShorterThanNullAdjustment: number = 0;

    /**
     * True if at least one row in the column this represents has a null value.
     */
    ContainsNull: boolean = false;

    /**
     * If this TableTemplate corresponds to an object or array, Children contains sub-templates
     * for the array/object's children.
     */
    Children: TableTemplate[] = [];

    constructor(pads: PaddedFormattingTokens, numberListAlignment: NumberListAlignment) {
        this._pads = pads;
        this._numberListAlignment = numberListAlignment;
    }

    /**
     * Analyzes an object/array for formatting as a table, formatting as a compact multiline array, or
     * formatting as an expanded object with aligned properties.  In the first two cases, we measure recursively so
     * that values nested inside arrays and objects can be aligned too.
     *
     * The item given is presumed to require multiple lines.  For table formatting, each of its children is
     * expected to be one row.  For compact multiline arrays, there will be multiple children per line, but they
     * will be given the same amount of space and lined up neatly when spanning multiple lines.  For expanded
     * object properties, the values may or may not span multiple lines, but the property names and the start of
     * their values will be on separate lines, lined up.
     */
    MeasureTableRoot(tableRoot: JsonItem, recursive: boolean): void {
        // For each row of the potential table, measure it and its children, making room for everything.
        // (Or, if there are incompatible types at any level, set CanBeUsedInTable to false.)
        for (const child of tableRoot.Children)
            this.MeasureRowSegment(child, recursive);

        // Get rid of incomplete junk and determine our final size.
        this.PruneAndRecompute(Number.MAX_VALUE);
    }

    /**
     * Check if the template's width fits in the given size.  Repeatedly drop inner formatting and
     * recompute to make it fit, if needed.
     *
     * Fully expanded, an array might look like this when table-formatted.
     *
     * [
     *     { "a": 3.4, "b":   8, "c": {"x": 2, "y": 16        } },
     *     { "a": 2,   "b": 301, "c": {        "y": -4, "z": 0} }
     * ]
     *
     * If that's too wide, the template will give up trying to align the x,y,z properties but keep the rest.
     *
     * [
     *     { "a": 3.4, "b":   8, "c": {"x": 2, "y": 16} },
     *     { "a": 2,   "b": 301, "c": {"y": -4, "z": 0} }
     * ]
     */
    TryToFit(maximumLength: number): boolean {
        for (let complexity = this.GetTemplateComplexity(); complexity >= 1; --complexity) {
            if (this.TotalLength <= maximumLength)
                return true;
            this.PruneAndRecompute(complexity - 1);
        }

        return false;
    }

    /**
     * Added the number, properly aligned and possibly reformatted, according to our measurements.
     * This assumes that the segment is a number list, and therefore that the item is a number or null.
     */
    FormatNumber(buffer: IBuffer, item: JsonItem, commaBeforePadType: string): void {
        // The easy cases.  Use the value exactly as it was in the source doc.
        switch (this._numberListAlignment) {
            case NumberListAlignment.Left:
                buffer.Add(item.Value, commaBeforePadType,
                    this._pads.Spaces(this.MaxValueLength - item.ValueLength));
                return;
            case NumberListAlignment.Right:
                buffer.Add(this._pads.Spaces(this.MaxValueLength - item.ValueLength), item.Value,
                    commaBeforePadType);
                return;
        }

        if (item.Type === JsonItemType.Null) {
            buffer.Add(this._pads.Spaces(this._maxDigBeforeDec - item.ValueLength), item.Value,
                commaBeforePadType, this._pads.Spaces(this.CompositeValueLength - this._maxDigBeforeDec));
            return;
        }

        // Normalize case - rewrite the number with the appropriate precision.
        if (this._numberListAlignment === NumberListAlignment.Normalize) {
            const parsedVal = Number(item.Value);
            const reformattedStr = parsedVal.toFixed(this._maxDigAfterDec);
            buffer.Add(this._pads.Spaces(this.CompositeValueLength - reformattedStr.length), reformattedStr,
                commaBeforePadType);
            return;
        }

        // Decimal case - line up the decimals (or E's) but leave the value exactly as it was in the source.
        let leftPad: number;
        let rightPad: number;
        const indexOfDot = item.Value.search(TableTemplate._dotOrE);
        if (indexOfDot > 0) {
            leftPad = this._maxDigBeforeDec - indexOfDot;
            rightPad = this.CompositeValueLength - leftPad - item.ValueLength;
        }
        else {
            leftPad = this._maxDigBeforeDec - item.ValueLength;
            rightPad = this.CompositeValueLength - this._maxDigBeforeDec;
        }

        buffer.Add(this._pads.Spaces(leftPad), item.Value, commaBeforePadType, this._pads.Spaces(rightPad));
    }

    /**
     * Length of the largest item - including property name, comments, and padding - that can't be split across
     * multiple lines.
     */
    AtomicItemSize(): number {
        return this.NameLength
            + this._pads.ColonLen
            + this.MiddleCommentLength
            + ((this.MiddleCommentLength > 0) ? this._pads.CommentLen : 0)
            + this.MaxAtomicValueLength
            + this.PostfixCommentLength
            + ((this.PostfixCommentLength > 0) ? this._pads.CommentLen : 0)
            + this._pads.CommaLen;
    }

    // Regex to help us distinguish between numbers that truly have a zero value - which can take many forms like
    // 0, 0.000, and 0.0e75 - and numbers too small for a 64bit float, such as 1e-500.
    private static readonly _trulyZeroValString = new RegExp("^-?[0.]+([eE].*)?$");

    private static readonly _dotOrE = new RegExp("[.eE]");
    private static readonly _maxCharsForNormalize = 16;

    private readonly _pads: PaddedFormattingTokens;
    private _numberListAlignment: NumberListAlignment;
    private _maxDigBeforeDec: number = 0;
    private _maxDigAfterDec: number = 0;

    /**
     * Adjusts this TableTemplate (and its children) to make room for the given rowSegment (and its children).
     */
    private MeasureRowSegment(rowSegment: JsonItem, recursive:boolean): void {
        // Standalone comments and blank lines don't figure into template measurements
        if (rowSegment.Type === JsonItemType.BlankLine || rowSegment.Type === JsonItemType.BlockComment
            || rowSegment.Type === JsonItemType.LineComment)
            return;

        let rowTableType: TableColumnType;
        switch (rowSegment.Type) {
            case JsonItemType.Null:
                rowTableType = TableColumnType.Unknown;
                break;
            case JsonItemType.Number:
                rowTableType = TableColumnType.Number;
                break;
            case JsonItemType.Array:
                rowTableType = TableColumnType.Array;
                break;
            case JsonItemType.Object:
                rowTableType = TableColumnType.Object;
                break;
            default:
                rowTableType = TableColumnType.Simple;
                break;
        }

        if (this.Type === TableColumnType.Unknown) {
            this.Type = rowTableType;
        }
        else if (rowTableType !== TableColumnType.Unknown && this.Type !== rowTableType) {
            this.Type = TableColumnType.Mixed;
        }

        if (rowSegment.Type === JsonItemType.Null) {
            this._maxDigBeforeDec = Math.max(this._maxDigBeforeDec, this._pads.LiteralNullLen);
            this.ContainsNull = true;
        }

        if (rowSegment.RequiresMultipleLines) {
            this.RequiresMultipleLines = true;
            this.Type = TableColumnType.Mixed;
        }

        // Update the numbers
        this.RowCount += 1;
        this.NameLength = Math.max(this.NameLength, rowSegment.NameLength);
        this.NameMinimum = Math.min(this.NameMinimum, rowSegment.NameLength);
        this.MaxValueLength = Math.max(this.MaxValueLength, rowSegment.ValueLength);
        this.MiddleCommentLength = Math.max(this.MiddleCommentLength, rowSegment.MiddleCommentLength);
        this.PrefixCommentLength = Math.max(this.PrefixCommentLength, rowSegment.PrefixCommentLength);
        this.PostfixCommentLength = Math.max(this.PostfixCommentLength, rowSegment.PostfixCommentLength);
        this.IsAnyPostCommentLineStyle ||= rowSegment.IsPostCommentLineStyle;
        this.AnyMiddleCommentHasNewline ||= rowSegment.MiddleCommentHasNewLine;

        if (rowSegment.Type !== JsonItemType.Array && rowSegment.Type !== JsonItemType.Object)
            this.MaxAtomicValueLength = Math.max(this.MaxAtomicValueLength, rowSegment.ValueLength);

        if (rowSegment.Complexity >= 2)
            this.PadType = BracketPaddingType.Complex;

        if (this.RequiresMultipleLines || rowSegment.Type === JsonItemType.Null)
            return;

        if (this.Type === TableColumnType.Array && recursive) {
            // For each row in this rowSegment, find or create this TableTemplate's child template for
            // the that array index, and then measure recursively.
            for (let i = 0; i < rowSegment.Children.length; ++i) {
                if (this.Children.length <= i)
                    this.Children.push(new TableTemplate(this._pads, this._numberListAlignment));
                this.Children[i].MeasureRowSegment(rowSegment.Children[i], true);
            }
        }
        else if (this.Type === TableColumnType.Object && recursive) {
            // If this object has multiple children with the same property name, which is allowed by the JSON standard,
            // although it's hard to imagine anyone would deliberately do it, we can't format it as part of a table.
            if (this.ContainsDuplicateKeys(rowSegment.Children)) {
                this.Type = TableColumnType.Simple;
                return;
            }

            // For each property in rowSegment, check whether there's sub-template with the same name.  If not
            // found, create one.  Then measure recursively.
            for (const rowSegChild of rowSegment.Children) {
                let subTemplate = this.Children.find(tt => tt.LocationInParent === rowSegChild.Name);
                if (!subTemplate) {
                    subTemplate = new TableTemplate(this._pads, this._numberListAlignment);
                    subTemplate.LocationInParent = rowSegChild.Name;
                    this.Children.push(subTemplate);
                }
                subTemplate.MeasureRowSegment(rowSegChild, true);
            }
        }

        // The rest is only relevant to number columns were we plan to align the decimal points.
        const skipDecimalStuff = this.Type !== TableColumnType.Number
            || this._numberListAlignment === NumberListAlignment.Left
            || this._numberListAlignment === NumberListAlignment.Right;
        if (skipDecimalStuff)
            return;

        // For Decimal, we use the string exactly as it is from the input document.  For Normalize, we need to rewrite
        // it before we count digits.
        let normalizedStr = rowSegment.Value;
        if (this._numberListAlignment === NumberListAlignment.Normalize) {
            const parsedVal = Number(normalizedStr);
            normalizedStr = parsedVal.toString();

            // Normalize only works for numbers that can be faithfully represented without too many digits and without
            // scientific notation.  The JSON standard allows numbers of any length/precision.  If we detect any case
            // where we'd lose precision, fall back to left alignment for this column.
            const canNormalize = !Number.isNaN(parsedVal)
                && parsedVal !== Number.POSITIVE_INFINITY && parsedVal !== Number.NEGATIVE_INFINITY
                && normalizedStr.length <= TableTemplate._maxCharsForNormalize
                && normalizedStr.indexOf('e') < 0
                && (parsedVal !== 0.0 || TableTemplate._trulyZeroValString.test(rowSegment.Value));
            if (!canNormalize) {
                this._numberListAlignment = NumberListAlignment.Left;
                return;
            }
        }

        const indexOfDot = normalizedStr.search(TableTemplate._dotOrE);
        this._maxDigBeforeDec = Math.max(this._maxDigBeforeDec, (indexOfDot >= 0)? indexOfDot : normalizedStr.length);
        this._maxDigAfterDec = Math.max(this._maxDigAfterDec,
            (indexOfDot >= 0)? normalizedStr.length - indexOfDot -1 : 0);
    }


    private PruneAndRecompute(maxAllowedComplexity: number): void {
        const clearChildren = maxAllowedComplexity <= 0
            || (this.Type !== TableColumnType.Array && this.Type !== TableColumnType.Object)
            || this.RowCount < 2;
        if (clearChildren)
            this.Children = [];

        for (const subTemplate of this.Children)
            subTemplate.PruneAndRecompute(maxAllowedComplexity-1);

        if (this.Type === TableColumnType.Number) {
            this.CompositeValueLength = this.GetNumberFieldWidth();
        }
        else if (this.Children.length>0) {
            const totalChildLen = this.Children.map(ch => ch.TotalLength).reduce((prev:number, cur:number) => prev + cur);
            this.CompositeValueLength = totalChildLen
                + Math.max(0, this._pads.CommaLen * (this.Children.length-1))
                + this._pads.ArrStartLen(this.PadType)
                + this._pads.ArrEndLen(this.PadType);
            if (this.ContainsNull && this.CompositeValueLength < this._pads.LiteralNullLen) {
                this.ShorterThanNullAdjustment = this._pads.LiteralNullLen - this.CompositeValueLength;
                this.CompositeValueLength = this._pads.LiteralNullLen;
            }
        }
        else  {
            this.CompositeValueLength = this.MaxValueLength;
        }

        this.TotalLength =
            ((this.PrefixCommentLength > 0)? this.PrefixCommentLength + this._pads.CommentLen : 0)
            + ((this.NameLength > 0)? this.NameLength + this._pads.ColonLen : 0)
            + ((this.MiddleCommentLength > 0)? this.MiddleCommentLength + this._pads.CommentLen : 0)
            + this.CompositeValueLength
            + ((this.PostfixCommentLength > 0)? this.PostfixCommentLength + this._pads.CommentLen : 0);
    }

    private GetTemplateComplexity(): number {
        if (this.Children.length === 0)
            return 0;
        const childComplexities = this.Children.map(ch => ch.GetTemplateComplexity());
        return 1 + Math.max(...childComplexities);
    }

    private ContainsDuplicateKeys(list: JsonItem[]): boolean {
        const seenNames = new Set<string>();
        for (const item of list) {
            if (seenNames.has(item.Name))
                return true;
            seenNames.add(item.Name);
        }
        return false;
    }

    private GetNumberFieldWidth(): number {
        if (this._numberListAlignment === NumberListAlignment.Normalize
            || this._numberListAlignment === NumberListAlignment.Decimal) {
            const rawDecLen = (this._maxDigAfterDec > 0)? 1 : 0;
            return this._maxDigBeforeDec + rawDecLen + this._maxDigAfterDec;
        }

        return this.MaxValueLength;
    }
}
