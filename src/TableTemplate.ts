/**
 * Collects spacing information about the columns of a potential table.  Each TableTemplate corresponds do
 * a part of a row, and they're nested recursively to match the JSON structure.
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
import {FracturedJsonError} from "./FracturedJsonError";

export class TableTemplate {
    /**
     * The property name in the table that this segment matches up with.
     */
    LocationInParent: string | undefined = undefined;
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
    PadType: BracketPaddingType = BracketPaddingType.Simple;
    IsFormattableNumber: boolean = false;
    CompositeValueLength: number = 0;
    TotalLength: number = 0;

    /**
     * If this TableTemplate corresponds to an object or array, Children contains sub-templates
     * for the array/object's children.
     */
    Children: TableTemplate[] = [];

    constructor(pads: PaddedFormattingTokens, allowReformattingNumbers:boolean) {
        this._pads = pads;
        this._allowReformattingNumbers = allowReformattingNumbers;
        this.IsFormattableNumber = allowReformattingNumbers;
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

    FormatNumber(originalValueString: string): string {
        if (!this.IsFormattableNumber)
            throw new FracturedJsonError("Logic error - attempting to format inappropriate thing as number");

        const numericVal = Number(originalValueString);
        const formattedString = numericVal.toFixed(this._maxDigitsAfterDecimal);
        return formattedString.padStart(this.CompositeValueLength);
    }

    private readonly _pads: PaddedFormattingTokens;
    private readonly _allowReformattingNumbers;
    private _maxDigitsBeforeDecimal: number = 0;
    private _maxDigitsAfterDecimal: number = 0;
    private _dataContainsNull: boolean = false;

    /**
     * Adjusts this TableTemplate (and its children) to make room for the given rowSegment (and its children).
     */
    private MeasureRowSegment(rowSegment: JsonItem): void {
        // Standalone comments and blank lines don't figure into template measurements
        if (rowSegment.Type == JsonItemType.BlankLine || rowSegment.Type == JsonItemType.BlockComment
            || rowSegment.Type == JsonItemType.LineComment)
            return;

        // Make sure this rowSegment's type is compatible with the ones we've seen so far.  Null is compatible
        // with all types.  It the types aren't compatible, we can still align this element and its comments,
        // but not any children for arrays/objects.
        if (rowSegment.Type == JsonItemType.False || rowSegment.Type == JsonItemType.True) {
            this.IsRowDataCompatible &&= (this.Type == JsonItemType.True || this.Type == JsonItemType.Null);
            this.Type = JsonItemType.True;
            this.IsFormattableNumber = false;
        }
        else if (rowSegment.Type == JsonItemType.Number) {
            this.IsRowDataCompatible &&= (this.Type == JsonItemType.Number || this.Type == JsonItemType.Null);
            this.Type = JsonItemType.Number;
        }
        else if (rowSegment.Type == JsonItemType.Null) {
            this._dataContainsNull = true;
        }
        else {
            this.IsRowDataCompatible &&= (this.Type == rowSegment.Type || this.Type == JsonItemType.Null);
            if (this.Type == JsonItemType.Null)
                this.Type = rowSegment.Type;
            this.IsFormattableNumber = false;
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

        if (rowSegment.Complexity >= 2)
            this.PadType = BracketPaddingType.Complex;

        if (!this.IsRowDataCompatible)
            return;

        if (rowSegment.Type == JsonItemType.Array) {
            // For each row in this rowSegment, find or create this TableTemplate's child template for
            // the that array index, and then measure recursively.
            for (let i = 0; i < rowSegment.Children.length; ++i) {
                if (this.Children.length <= i)
                    this.Children.push(new TableTemplate(this._pads, this._allowReformattingNumbers));
                this.Children[i].MeasureRowSegment(rowSegment.Children[i]);
            }
        }
        else if (rowSegment.Type == JsonItemType.Object) {
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
                    subTemplate = new TableTemplate(this._pads, this._allowReformattingNumbers);
                    subTemplate.LocationInParent = rowSegChild.Name;
                    this.Children.push(subTemplate);
                }
                subTemplate.MeasureRowSegment(rowSegChild);
            }
        }
        else if (rowSegment.Type == JsonItemType.Number && this.IsFormattableNumber) {
            const maxChars = 15;
            const normalizedVal = Number(rowSegment.Value).toString();
            this.IsFormattableNumber = normalizedVal.length <= maxChars && normalizedVal.indexOf("e") < 0;

            const indexOfDot = normalizedVal.indexOf(".");
            this._maxDigitsBeforeDecimal = Math.max(this._maxDigitsBeforeDecimal,
                (indexOfDot>=0)? indexOfDot : normalizedVal.length);
            this._maxDigitsAfterDecimal = Math.max(this._maxDigitsAfterDecimal,
                (indexOfDot>=0)? normalizedVal.length - indexOfDot - 1 : 0);
        }
    }


    private PruneAndRecompute(maxAllowedComplexity: number): void {
        if (maxAllowedComplexity <= 0)
            this.Children = [];

        for (const subTemplate of this.Children)
            subTemplate.PruneAndRecompute(maxAllowedComplexity-1);

        if (!this.IsRowDataCompatible)
            this.Children = [];

        this.CompositeValueLength = this.SimpleValueLength;
        if (this.Children.length>0) {
            const totalChildLen = this.Children.map(ch => ch.TotalLength).reduce((prev:number, cur:number) => prev + cur);
            this.CompositeValueLength = totalChildLen
                + Math.max(0, this._pads.CommaLen * (this.Children.length-1))
                + this._pads.ArrStartLen(this.PadType)
                + this._pads.ArrEndLen(this.PadType);
        }
        else if (this.IsFormattableNumber) {
            this.CompositeValueLength = this._maxDigitsBeforeDecimal
                + this._maxDigitsAfterDecimal
                + ((this._maxDigitsAfterDecimal > 0)? 1 : 0);

            // Allow room for null.
            if (this._dataContainsNull && this.CompositeValueLength < 4)
                this.CompositeValueLength = 4;
        }

        this.TotalLength =
            ((this.PrefixCommentLength > 0)? this.PrefixCommentLength + this._pads.CommentLen : 0)
            + ((this.NameLength > 0)? this.NameLength + this._pads.ColonLen : 0)
            + ((this.MiddleCommentLength > 0)? this.MiddleCommentLength + this._pads.CommentLen : 0)
            + this.CompositeValueLength
            + ((this.PostfixCommentLength > 0)? this.PostfixCommentLength + this._pads.CommentLen : 0);
    }

    private GetTemplateComplexity(): number {
        if (this.Children.length == 0)
            return 0;
        const childComplexities = this.Children.map(ch => ch.GetTemplateComplexity());
        return 1 + Math.max(...childComplexities);
    }

    private ContainsDuplicateKeys(list: JsonItem[]): boolean {
        const keys = list.map(ji => ji.Name);
        return keys.some((v:string, i:number) => keys.indexOf(v)!==i);
    }
}
