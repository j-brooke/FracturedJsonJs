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

export class TableTemplate {
    /**
     * The property name in the table that this segment matches up with.
     */
    LocationInParent: string | undefined = undefined;

    /**
     * The type of values in the column, if they're uniform.  There's some wiggle-room here: for instance,
     * true and false have different JsonItemTypes but are considered the same type for table purposes.
     */
    Type: JsonItemType = JsonItemType.Null;

    /**
     * Assessment of whether this is a viable column.  The main qualifying factor is that all corresponding pieces
     * of each row are the same type.
     */
    IsRowDataCompatible: boolean = true;
    RowCount: number = 0;

    NameLength: number = 0;
    SimpleValueLength: number = 0;
    PrefixCommentLength: number = 0;
    MiddleCommentLength: number = 0;
    PostfixCommentLength: number = 0;
    IsAnyPostCommentLineStyle: boolean = false;
    PadType: BracketPaddingType = BracketPaddingType.Simple;

    /**
     * True if this is a number column and we're allowed by settings to normalize numbers (rewrite them with the same
     * precision), and if none of the numbers have too many digits or require scientific notation.
     */
    AllowNumberNormalization: boolean = false;

    /**
     * True if this column contains only numbers and nulls.  Number columns are formatted specially, depending on
     * settings.
     */
    IsNumberList: boolean = false;

    /**
     * Length of the value for this template when things are complicated.  For arrays and objects, it's the sum of
     * all the child templates' lengths, plus brackets and commas and such.  For number lists, it's the space
     * required to align them as appropriate.
     */
    CompositeValueLength: number = 0;

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
     * Length of the entire template, including space for the value, property name, and all comments.
     */
    TotalLength: number = 0;

    /**
     * If this TableTemplate corresponds to an object or array, Children contains sub-templates
     * for the array/object's children.
     */
    Children: TableTemplate[] = [];

    constructor(pads: PaddedFormattingTokens, numberListAlignment: NumberListAlignment) {
        this._pads = pads;
        this._numberListAlignment = numberListAlignment;
        this.AllowNumberNormalization = (numberListAlignment===NumberListAlignment.Normalize);
        this.IsNumberList = true;
    }

    /**
     * Analyzes an object/array for formatting as a potential table.  The tableRoot is a container that
     * is split out across many lines.  Each "row" is a single child written inline.
     */
    MeasureTableRoot(tableRoot: JsonItem): void {
        // For each row of the potential table, measure it and its children, making room for everything.
        // (Or, if there are incompatible types at any level, set CanBeUsedInTable to false.)
        for (const child of tableRoot.Children)
            this.MeasureRowSegment(child);

        // Get rid of incomplete junk and figure out our size.
        this.PruneAndRecompute(Number.MAX_VALUE);

        // If there are fewer than 2 actual data rows (i.e., not standalone comments), no point making a table.
        this.IsRowDataCompatible &&= (this.RowCount >= 2);
    }

    TryToFit(maximumLength: number): boolean {
        for (let complexity = this.GetTemplateComplexity(); complexity >= 0; --complexity) {
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
        const formatType = (this._numberListAlignment===NumberListAlignment.Normalize && !this.AllowNumberNormalization)
            ? NumberListAlignment.Left
            : this._numberListAlignment;

        // The easy cases.  Use the value exactly as it was in the source doc.
        switch (formatType) {
            case NumberListAlignment.Left:
                buffer.Add(item.Value, commaBeforePadType,
                    this._pads.Spaces(this.SimpleValueLength - item.ValueLength));
                return;
            case NumberListAlignment.Right:
                buffer.Add(this._pads.Spaces(this.SimpleValueLength - item.ValueLength), item.Value,
                    commaBeforePadType);
                return;
        }

        let maxDigBefore: number;
        let valueStr: string;
        let valueLength: number;

        if (formatType === NumberListAlignment.Normalize) {
            // Normalize case - rewrite the number with the appropriate precision.
            if (item.Type === JsonItemType.Null) {
                buffer.Add(this._pads.Spaces(this._maxDigBeforeDecNorm - item.ValueLength), item.Value,
                    commaBeforePadType, this._pads.Spaces(this.CompositeValueLength - this._maxDigBeforeDecNorm));
                return;
            }

            maxDigBefore = this._maxDigBeforeDecNorm;
            const numericVal = Number(item.Value);
            valueStr = numericVal.toFixed(this._maxDigAfterDecNorm);
            valueLength = valueStr.length;
        }
        else {
            // Decimal case - line up the decimals (or E's) but leave the value exactly as it was in the source.
            maxDigBefore = this._maxDigBeforeDecRaw;
            valueStr = item.Value;
            valueLength = item.ValueLength;
        }

        let leftPad: number;
        let rightPad: number;
        const indexOfDot = valueStr.search(TableTemplate._dotOrE);
        if (indexOfDot > 0) {
            leftPad = maxDigBefore - indexOfDot;
            rightPad = this.CompositeValueLength - leftPad - valueLength;
        }
        else {
            leftPad = maxDigBefore - valueLength;
            rightPad = this.CompositeValueLength - maxDigBefore;
        }

        buffer.Add(this._pads.Spaces(leftPad), valueStr, commaBeforePadType, this._pads.Spaces(rightPad));
    }

    private static readonly _trulyZeroValString = new RegExp("^-?[0.]+([eE].*)?$");
    private static readonly _dotOrE = new RegExp("[.eE]");
    private readonly _pads: PaddedFormattingTokens;
    private _numberListAlignment: NumberListAlignment;
    private _maxDigBeforeDecRaw: number = 0;
    private _maxDigAfterDecRaw: number = 0;
    private _maxDigBeforeDecNorm: number = 0;
    private _maxDigAfterDecNorm: number = 0;

    /**
     * Adjusts this TableTemplate (and its children) to make room for the given rowSegment (and its children).
     */
    private MeasureRowSegment(rowSegment: JsonItem): void {
        // Standalone comments and blank lines don't figure into template measurements
        if (rowSegment.Type === JsonItemType.BlankLine || rowSegment.Type === JsonItemType.BlockComment
            || rowSegment.Type === JsonItemType.LineComment)
            return;

        // Make sure this rowSegment's type is compatible with the ones we've seen so far.  Null is compatible
        // with all types.  It the types aren't compatible, we can still align this element and its comments,
        // but not any children for arrays/objects.
        if (rowSegment.Type === JsonItemType.False || rowSegment.Type === JsonItemType.True) {
            this.IsRowDataCompatible &&= (this.Type === JsonItemType.True || this.Type === JsonItemType.Null);
            this.Type = JsonItemType.True;
            this.IsNumberList = false;
        }
        else if (rowSegment.Type === JsonItemType.Number) {
            this.IsRowDataCompatible &&= (this.Type === JsonItemType.Number || this.Type === JsonItemType.Null);
            this.Type = JsonItemType.Number;
        }
        else if (rowSegment.Type === JsonItemType.Null) {
            this._maxDigBeforeDecNorm = Math.max(this._maxDigBeforeDecNorm, this._pads.LiteralNullLen);
            this._maxDigBeforeDecRaw = Math.max(this._maxDigBeforeDecRaw, this._pads.LiteralNullLen);
            this.ContainsNull = true;
        }
        else {
            this.IsRowDataCompatible &&= (this.Type === rowSegment.Type || this.Type === JsonItemType.Null);
            if (this.Type === JsonItemType.Null)
                this.Type = rowSegment.Type;
            this.IsNumberList = false;
        }

        // If multiple lines are necessary for a row (probably due to pesky comments), we can't make a table.
        this.IsRowDataCompatible &&= !rowSegment.RequiresMultipleLines;

        // Update the numbers
        this.RowCount += 1;
        this.NameLength = Math.max(this.NameLength, rowSegment.NameLength);
        this.SimpleValueLength = Math.max(this.SimpleValueLength, rowSegment.ValueLength);
        this.MiddleCommentLength = Math.max(this.MiddleCommentLength, rowSegment.MiddleCommentLength);
        this.PrefixCommentLength = Math.max(this.PrefixCommentLength, rowSegment.PrefixCommentLength);
        this.PostfixCommentLength = Math.max(this.PostfixCommentLength, rowSegment.PostfixCommentLength);
        this.IsAnyPostCommentLineStyle ||= rowSegment.IsPostCommentLineStyle;

        if (rowSegment.Complexity >= 2)
            this.PadType = BracketPaddingType.Complex;

        // Everything after this is moot if the column doesn't have a uniform type.
        if (!this.IsRowDataCompatible)
            return;

        if (rowSegment.Type === JsonItemType.Array) {
            // For each row in this rowSegment, find or create this TableTemplate's child template for
            // the that array index, and then measure recursively.
            for (let i = 0; i < rowSegment.Children.length; ++i) {
                if (this.Children.length <= i)
                    this.Children.push(new TableTemplate(this._pads, this._numberListAlignment));
                this.Children[i].MeasureRowSegment(rowSegment.Children[i]);
            }
        }
        else if (rowSegment.Type === JsonItemType.Object) {
            // If this object has multiple children with the same property name, which is allowed by the JSON standard
            // although it's hard to imagine anyone would deliberately do it, we can't format it as part of a table.
            if (this.ContainsDuplicateKeys(rowSegment.Children)) {
                this.IsRowDataCompatible = false;
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
                subTemplate.MeasureRowSegment(rowSegChild);
            }
        }
        else if (rowSegment.Type === JsonItemType.Number && this.IsNumberList) {
            // So far, everything in this column is a number (or null).  We need to reevaluate whether we're allowed
            // to normalize the numbers - write them all with the same number of digits after the decimal point.
            // We also need to take some measurements for both contingencies.
            const maxChars = 15;
            const parsedVal = Number(rowSegment.Value);
            const normalizedStr = parsedVal.toString();
            this.AllowNumberNormalization &&= !isNaN(parsedVal)
                && parsedVal !== Infinity && parsedVal !== -Infinity
                && normalizedStr.length <= maxChars
                && normalizedStr.indexOf("e") < 0
                && (parsedVal!==0.0 || TableTemplate._trulyZeroValString.test(rowSegment.Value));

            // Measure the number of digits before and after the decimal point if we write it as a standard,
            // non-scientific notation number.
            const indexOfDotNorm = normalizedStr.indexOf('.');
            this._maxDigBeforeDecNorm =
                Math.max(this._maxDigBeforeDecNorm, (indexOfDotNorm >= 0) ? indexOfDotNorm : normalizedStr.length);
            this._maxDigAfterDecNorm =
                Math.max(this._maxDigAfterDecNorm, (indexOfDotNorm >= 0) ? normalizedStr.length - indexOfDotNorm - 1 : 0);

            // Measure the number of digits before and after the decimal point (or E scientific notation with not
            // decimal point), using the number exactly as it was in the input document.
            const indexOfDotRaw = rowSegment.Value.search(TableTemplate._dotOrE);
            this._maxDigBeforeDecRaw =
                Math.max(this._maxDigBeforeDecRaw, (indexOfDotRaw >= 0) ? indexOfDotRaw : rowSegment.ValueLength);
            this._maxDigAfterDecRaw =
                Math.max(this._maxDigAfterDecRaw, (indexOfDotRaw >= 0) ? rowSegment.ValueLength - indexOfDotRaw - 1 : 0);
        }

        this.AllowNumberNormalization &&= this.IsNumberList;
    }


    private PruneAndRecompute(maxAllowedComplexity: number): void {
        if (maxAllowedComplexity <= 0 || !this.IsRowDataCompatible)
            this.Children = [];

        for (const subTemplate of this.Children)
            subTemplate.PruneAndRecompute(maxAllowedComplexity-1);

        if (this.IsNumberList) {
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
            this.CompositeValueLength = this.SimpleValueLength;
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
        const keys = list.map(ji => ji.Name);
        return keys.some((v:string, i:number) => keys.indexOf(v)!==i);
    }

    private GetNumberFieldWidth(): number {
        if (this._numberListAlignment === NumberListAlignment.Normalize && this.AllowNumberNormalization)
        {
            const normDecLen = (this._maxDigAfterDecNorm > 0) ? 1 : 0;
            return this._maxDigBeforeDecNorm + normDecLen + this._maxDigAfterDecNorm;
        }
        else if (this._numberListAlignment === NumberListAlignment.Decimal)
        {
            const rawDecLen = (this._maxDigAfterDecRaw > 0) ? 1 : 0;
            return this._maxDigBeforeDecRaw + rawDecLen + this._maxDigAfterDecRaw;
        }

        return this.SimpleValueLength;
    }
}
