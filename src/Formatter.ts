import {FracturedJsonOptions} from "./FracturedJsonOptions";
import {IBuffer} from "./IBuffer";
import {StringJoinBuffer} from "./StringJoinBuffer";
import {PaddedFormattingTokens} from "./PaddedFormattingTokens";
import {JsonItem} from "./JsonItem";
import {JsonItemType} from "./JsonItemType";
import {BracketPaddingType} from "./BracketPaddingType";
import {TableTemplate} from "./TableTemplate";
import {FracturedJsonError} from "./FracturedJsonError";
import {Parser} from "./Parser";
import {ConvertDataToDom} from "./ConvertDataToDom";
import {TableCommaPlacement} from "./TableCommaPlacement";
import {TableColumnType} from "./TableColumnType";

/**
 * Class that writes JSON data in a human-friendly format.  Comments are optionally supported.  While many options
 * are supported through FracturedJsonOptions, generally this class should "just work", producing
 * reasonable output for any JSON doc.
 */
export class Formatter {
    /**
     * Settings to control the appearance of the output and what sort of input is permissible.
     */
    Options: FracturedJsonOptions = new FracturedJsonOptions();

    /**
     * Function that measures strings for alignment purposes.  The number returned should be the number of space-
     * equivalent units.  This is provided for use with East Asian languages, where some single characters
     * are rendered as taking up two spaces.  It could also be important for unicode surrogate.
     */
    StringLengthFunc: (str:string) => number = Formatter.StringLengthByCharCount;

    /**
     * The default string length function for use with StringLengthFunc.  It returns str.length.
     */
    static StringLengthByCharCount(str:string): number {
        return str.length;
    }

    /**
     * Reads in JSON text (or JSON-with-comments), and returns a nicely-formatted string of the same content.
     * @param jsonText a JSON document in text form that should be reformatted
     * @param startingDepth starting indentation level for output
     */
    Reformat(jsonText: string, startingDepth: number = 0): string {
        const buffer = new StringJoinBuffer();
        const parser = new Parser();
        parser.Options = this.Options;
        const docModel = parser.ParseTopLevel(jsonText, true);
        this.FormatTopLevel(docModel, startingDepth, buffer);

        buffer.Flush();
        return buffer.AsString();
    }

    /**
     * Writes the serialized object as a nicely-formatted string.
     * @param element the data to be written as JSON
     * @param startingDepth starting indentation level for output
     * @param recursionLimit nesting level at which we give up and assume we were given a circular reference
     */
    Serialize(element: any, startingDepth: number = 0, recursionLimit:number = 100): string | undefined {
        const buffer = new StringJoinBuffer();

        const docModel = ConvertDataToDom(element, undefined, recursionLimit);
        if (!docModel)
            return undefined;

        this.FormatTopLevel([docModel], startingDepth, buffer);

        buffer.Flush();
        return buffer.AsString();
    }

    /**
     * Writes a version of the given JSON (or JSON-with-comments) text that has all unnecessary space removed while
     * still preserving comments and blank lines, if that's what the settings require.
     * @param jsonText a JSON document in text form that should be reformatted
     */
    Minify(jsonText:string): string {
        const buffer = new StringJoinBuffer();
        const parser = new Parser();
        parser.Options = this.Options;
        const docModel = parser.ParseTopLevel(jsonText, true);
        this.MinifyTopLevel(docModel, buffer);

        buffer.Flush();
        return buffer.AsString();
    }

    private _buffer:IBuffer = new StringJoinBuffer();
    private _pads:PaddedFormattingTokens =
        new PaddedFormattingTokens(new FracturedJsonOptions(), Formatter.StringLengthByCharCount);

    /**
     * Display width of the line currently being written, in StringLengthFunc units.  Assigned at a few
     * checkpoints rather than on every buffer write.  Used to decide whether a closing bracket can share
     * the last child's line.
     */
    private _currentLineLen: number = 0;

    private FormatTopLevel(docModel: JsonItem[], startingDepth: number, buffer: IBuffer): void {
        this._buffer = buffer;
        this._pads = new PaddedFormattingTokens(this.Options, this.StringLengthFunc);
        this._currentLineLen = 0;

        for (const item of docModel) {
            this.ComputeItemLengths(item);
            this.StartLine(startingDepth);
            this.FormatItem(item, startingDepth, false, null);
            this._buffer.EndLine(this._pads.EOL);
        }

        this._buffer = new StringJoinBuffer();
    }

    /**
     * Runs StringLengthFunc on every part of every item and stores the value.  Also computes the total minimum
     * length, which for arrays and objects includes their child lengths.  We're going to use these values a lot,
     * and we don't want to run StringLengthFunc more than needed in case it's expensive.
     */
    private ComputeItemLengths(item: JsonItem): void {
        const newline = "\n";
        for (const child of item.Children)
            this.ComputeItemLengths(child);

        switch (item.Type) {
            case JsonItemType.Null:
                item.ValueLength = this._pads.LiteralNullLen;
                break;
            case JsonItemType.True:
                item.ValueLength = this._pads.LiteralTrueLen;
                break;
            case JsonItemType.False:
                item.ValueLength = this._pads.LiteralFalseLen;
                break;
            default:
                item.ValueLength = this.StringLengthFunc(item.Value);
                break;
        }

        item.NameLength = this.StringLengthFunc(item.Name);
        item.PrefixCommentLength = this.StringLengthFunc(item.PrefixComment);
        item.MiddleCommentLength = this.StringLengthFunc(item.MiddleComment);
        item.PostfixCommentLength = this.StringLengthFunc(item.PostfixComment);

        item.RequiresMultipleLines =
            !Formatter.IsElement(item)
            || item.Children.some(ch => ch.RequiresMultipleLines || ch.IsPostCommentLineStyle)
            || item.PrefixComment.indexOf(newline) >= 0
            || item.MiddleComment.indexOf(newline) >= 0
            || item.PostfixComment.indexOf(newline) >= 0
            || item.Value.indexOf(newline) >= 0;

        if (item.Type === JsonItemType.Array || item.Type === JsonItemType.Object) {
            const padType = Formatter.GetPaddingType(item);
            item.ValueLength =
                this._pads.StartLen(item.Type, padType)
                + this._pads.EndLen(item.Type, padType)
                + item.Children.map(ch => ch.MinimumTotalLength).reduce((p:number, c:number) => p+c, 0)
                + Math.max(0, this._pads.CommaLen * (item.Children.length-1));
        }

        // Note that we're not considering this item's own trailing comma, if any.  But we are considering
        // commas between children.
        item.MinimumTotalLength =
            ((item.PrefixCommentLength > 0)? item.PrefixCommentLength + this._pads.CommentLen : 0)
            + ((item.NameLength > 0)? item.NameLength + this._pads.ColonLen : 0)
            + ((item.MiddleCommentLength > 0)? item.MiddleCommentLength + this._pads.CommentLen : 0)
            + item.ValueLength
            + ((item.PostfixCommentLength > 0)? item.PostfixCommentLength + this._pads.CommentLen : 0);
    }

    /**
     * Adds a formatted version of any item to the buffer, including internal newlines and indentation, but the
     * indentation before the first line and line end after the last are the caller's responsibility.
     */
    private FormatItem(item: JsonItem,
                       depth: number,
                       includeTrailingComma: boolean,
                       parentTemplate: TableTemplate | null): void {
        switch (item.Type) {
            case JsonItemType.Array:
            case JsonItemType.Object:
                this.FormatContainer(item, depth, includeTrailingComma, parentTemplate);
                break;
            case JsonItemType.BlankLine:
                // Do nothing - the caller treats this as its own line and supplies the newline.
                break;
            case JsonItemType.BlockComment:
            case JsonItemType.LineComment:
                this.FormatStandaloneComment(item, depth);
                break;
            default:
                if (item.RequiresMultipleLines) {
                    const depthAfterColon = this.StandardFormatStart(item, depth, parentTemplate);
                    this._buffer.Add(item.Value);
                    this.StandardFormatEnd(item, includeTrailingComma);
                    this.SetLineWidthAfterPossiblySplitItem(item, depth, depthAfterColon, includeTrailingComma,
                        parentTemplate);
                }
                else {
                    this.InlineElement(item, includeTrailingComma, parentTemplate);
                    this.SetLineLengthAfterInlineItem(item, depth, includeTrailingComma, parentTemplate);
                }
                break;
        }
    }

    /**
     * Adds the representation for an array or object to the buffer.  The array/object might be formatted inline,
     * compact multiline, or expanded (with optional table segments).  The caller handles indentation before the
     * start and the newline after.
     */
    private FormatContainer(item: JsonItem,
                            depth: number,
                            includeTrailingComma: boolean,
                            parentTemplate: TableTemplate | null): void {
        // Try to inline or compact-multiline format, as long as we're deeper than AlwaysExpandDepth.  Of course,
        // there may be other disqualifying factors that are discovered along the way.
        if (depth > this.Options.AlwaysExpandDepth) {
            if (this.FormatContainerInline(item, depth, includeTrailingComma, parentTemplate))
                return;
        }

        // Create a helper object to measure how much space we'll need.  If there's a chance that we'll be able to
        // format this container as a compact array, we need to measure recursively.  Otherwise, we still
        // might need top level measurements for aligning properties and such.
        const recursiveTemplate = item.Complexity <= this.Options.MaxCompactArrayComplexity
            && item.Type === JsonItemType.Array;
        const template = new TableTemplate(this._pads, this.Options.NumberListAlignment);
        template.MeasureTableRoot(item, recursiveTemplate, 0, item.Children.length);

        if (depth > this.Options.AlwaysExpandDepth) {
            if (this.FormatContainerCompactMultiline(item, depth, includeTrailingComma, template, parentTemplate))
                return;
        }

        this.FormatContainerExpanded(item, depth, includeTrailingComma, template, parentTemplate);
    }

    /**
     * Writes a standalone comment.  Internal line breaks and indentation are taken care of here, but the
     * indentation before the first line and line end after the last are the caller's responsibility.
     */
    private FormatStandaloneComment(item: JsonItem, depth: number): void {
        const commentRows = Formatter.NormalizeMultilineComment(item.Value, item.InputPosition.Column);
        if (commentRows.length === 0)
            return;

        this._buffer.Add(commentRows[0]);
        for (let i = 1; i < commentRows.length; ++i) {
            this._buffer.EndLine(this._pads.EOL);
            this.StartLine(depth);
            this._buffer.Add(commentRows[i]);
        }
    }

    /**
     * Adds the representation for an array or object to the buffer, broken out on separate lines.  Spans of children
     * might be table-formatted together, depending on settings.
     */
    private FormatContainerExpanded(item: JsonItem, depth: number, includeTrailingComma: boolean,
                                    template: TableTemplate, parentTemplate: TableTemplate | null): void {
        const depthAfterColon = this.StandardFormatStart(item, depth, parentTemplate);
        this.WriteNonInlineOpeningBracket(item, depthAfterColon + 1, parentTemplate);

        // Decide whether to align this container's property values.  If so, pass this container's template along
        // to its children so they know how to align their property values.
        const alignProps = item.Type === JsonItemType.Object
            && template.NameLength - template.NameMinimum <= this.Options.MaxPropNamePadding
            && !template.AnyMiddleCommentHasNewline
            && this.AvailableLineSpace(depth + 1) >= template.AtomicItemSize();
        const templateToPass = (alignProps) ? template : null;
        if (templateToPass)
            templateToPass.Children = [];

        // Take note of the position of the last actual element, for comma decisions.  The last element
        // might not be the last item.
        const lastElementIndex = Formatter.IndexOfLastElement(item.Children);

        for (const run of this.DivideContainerIntoSegments(item, depth + 1)) {
            const wroteAsTable = run.canBeTable && this.WriteTableContainerSection(item, depthAfterColon,
                run.startIndex, run.length, lastElementIndex);
            if (!wroteAsTable)
                this.WriteExpandedContainerSection(item, depthAfterColon, templateToPass, run.startIndex, run.length,
                    lastElementIndex);
        }

        this.WriteNonInlineCloseBracket(item, depthAfterColon, includeTrailingComma);
        this.StandardFormatEnd(item, includeTrailingComma);
    }

    /**
     * Write a sequence of children from item, each starting on a new line.
     */
    private WriteExpandedContainerSection(item: JsonItem, depth: number, propTemplate: TableTemplate | null,
                                          startChildIndex: number, numChildren: number,
                                          lastElementIndex: number): void {
        const afterEndIndex = Math.min(item.Children.length, startChildIndex + numChildren);
        for (let i = startChildIndex; i < afterEndIndex; ++i) {
            if (i > 0)
                this.StartLine(depth + 1);

            this.FormatItem(item.Children[i], depth + 1, (i < lastElementIndex), propTemplate);

            if (i < item.Children.length - 1)
                this._buffer.EndLine(this._pads.EOL);
        }
    }

    /**
     * Write a sequence of children from item as a table, if possible.  Returns true if written.
     */
    private WriteTableContainerSection(item: JsonItem, depth: number, startChildIndex: number, numChildren: number,
                                       lastElementIndex: number): boolean {
        const template = new TableTemplate(this._pads, this.Options.NumberListAlignment);
        template.MeasureTableRoot(item, true, startChildIndex, numChildren);

        // If any particular row would require multiple lines, we can't table format this as a table.
        if (template.RequiresMultipleLines || template.Type === TableColumnType.Mixed)
            return false;

        // Figure out the space available to each row, not counting ending commas.  Note that if there's a middle
        // comment with a newline, we'll be indenting more than normal.
        const availableSpaceDepth = (item.MiddleCommentHasNewLine) ? depth + 2 : depth + 1;
        const availableSpace = this.AvailableLineSpace(availableSpaceDepth) - this._pads.CommaLen;

        if (!template.TryToFit(availableSpace))
            return false;

        const afterEndIndex = Math.min(item.Children.length, startChildIndex + numChildren);
        for (let i = startChildIndex; i < afterEndIndex; ++i) {
            if (i > 0)
                this.StartLine(depth + 1);

            const rowItem = item.Children[i];
            if (rowItem.Type === JsonItemType.BlankLine) {
                // Do nothing - an EOL is written at the end of the loop.
            }
            else if (rowItem.Type === JsonItemType.LineComment || rowItem.Type === JsonItemType.BlockComment) {
                this.FormatStandaloneComment(rowItem, depth + 1);
            }
            else {
                this.InlineTableRowSegment(template, rowItem, (i < lastElementIndex), true);
            }

            if (i < item.Children.length - 1)
                this._buffer.EndLine(this._pads.EOL);
        }

        return true;
    }

    /**
     * Tries to add the representation for an array or object to the buffer.
     * Returns true if the content was added.
     */
    private FormatContainerInline(item: JsonItem, depth: number, includeTrailingComma: boolean,
                                  parentTemplate: TableTemplate | null): boolean {
        if (item.RequiresMultipleLines)
            return false;

        // If we need to line up this item's value with others from the parent container, use the parentTemplate's
        // measurements to account for padding.
        let prefixLength;
        let nameLength;
        if (parentTemplate) {
            prefixLength = (parentTemplate.PrefixCommentLength > 0)
                ? parentTemplate.PrefixCommentLength + this._pads.CommentLen
                : 0;
            nameLength = (parentTemplate.NameLength > 0)? parentTemplate.NameLength + this._pads.ColonLen : 0;
        }
        else {
            prefixLength = (item.PrefixCommentLength > 0) ? item.PrefixCommentLength + this._pads.CommentLen : 0;
            nameLength = (item.NameLength > 0)? item.NameLength + this._pads.ColonLen : 0;
        }

        const lengthToConsider = prefixLength
            + nameLength
            + ((item.MiddleCommentLength > 0) ? item.MiddleCommentLength + this._pads.CommentLen : 0)
            + item.ValueLength
            + ((item.PostfixCommentLength > 0) ? item.PostfixCommentLength + this._pads.CommentLen : 0)
            + ((includeTrailingComma) ? this._pads.CommaLen : 0);

        if (item.Complexity > this.Options.MaxInlineComplexity || lengthToConsider > this.AvailableLineSpace(depth))
            return false;

        this.InlineElement(item, includeTrailingComma, parentTemplate);
        this.SetLineLengthAfterInlineItem(item, depth, includeTrailingComma, parentTemplate);

        return true;
    }

    /**
     * Tries to add the representation of this array to the buffer, spanning multiple lines but with each child
     * written inline and several of them per line.
     * Returns true if the content was added.
     */
    private FormatContainerCompactMultiline(item:JsonItem,
                                            depth:number,
                                            includeTrailingComma: boolean,
                                            template: TableTemplate,
                                            parentTemplate: TableTemplate | null): boolean {
        if (item.Type !== JsonItemType.Array)
            return false;
        if (item.Children.length === 0 || item.Children.length < this.Options.MinCompactArrayRowItems)
            return false;
        if (item.Complexity > this.Options.MaxCompactArrayComplexity)
            return false;
        if (item.RequiresMultipleLines)
            return false;

        const useTableFormatting = template.Type !== TableColumnType.Unknown && template.Type !== TableColumnType.Mixed;

        // If we can't fit lots of them on a line, compact multiline isn't a good choice.  Table would likely
        // be better.
        const likelyAvailableLineSpace = this.AvailableLineSpace(depth + 1);

        let avgItemWidth = this._pads.CommaLen;
        if (useTableFormatting) {
            avgItemWidth += template.TotalLength;
        } else {
            const childLengthSum = item.Children.reduce((p: number, c: JsonItem) => p + c.MinimumTotalLength, 0);
            avgItemWidth += Math.trunc(childLengthSum / item.Children.length);
        }
        if (avgItemWidth * this.Options.MinCompactArrayRowItems > likelyAvailableLineSpace)
            return false;

        const depthAfterColon = this.StandardFormatStart(item, depth, parentTemplate);
        this.WriteNonInlineOpeningBracket(item, depthAfterColon + 1, parentTemplate);

        const availableLineSpace = this.AvailableLineSpace(depthAfterColon + 1);
        let remainingLineSpace = -1;
        for (let i=0; i<item.Children.length; ++i) {
            // Figure out whether the next item fits on the current line.  If not, start a new one.
            const child = item.Children[i];
            const needsComma = (i < item.Children.length - 1);
            const spaceNeededForNext = ((needsComma)? this._pads.CommaLen : 0)
                + ((useTableFormatting)? template.TotalLength : child.MinimumTotalLength);

            if (remainingLineSpace < spaceNeededForNext) {
                if (i > 0) {
                    this._buffer.EndLine(this._pads.EOL);
                    this.StartLine(depthAfterColon + 1);
                }

                remainingLineSpace = availableLineSpace;
            }

            // Write it out
            if (useTableFormatting)
                this.InlineTableRowSegment(template, child, needsComma, false);
            else
                this.InlineElement(child, needsComma, null);
            remainingLineSpace -= spaceNeededForNext;
        }

        this._currentLineLen = this.Options.MaxTotalLineLength - remainingLineSpace;
        this.WriteNonInlineCloseBracket(item, depthAfterColon, includeTrailingComma);
        this.StandardFormatEnd(item, includeTrailingComma);
        return true;
    }

    /**
     * Adds the inline representation of this item to the buffer.  This includes all of this element's
     * comments and children when appropriate.  It DOES NOT include indentation, newlines, or any of that.  This
     * should only be called if item.RequiresMultipleLines is false.
     */
    private InlineElement(item: JsonItem, includeTrailingComma: boolean, parentTemplate: TableTemplate | null): void {
        if (item.RequiresMultipleLines)
            throw new FracturedJsonError("Logic error - trying to inline invalid element");

        this.WritePrefixNameMiddle(item, parentTemplate);
        this.InlineElementRaw(item);
        this.StandardFormatEnd(item, includeTrailingComma);
    }

    /**
     * Adds just this element's value to be buffer, inlined.  (Possibly recursively.)  This does not include
     * the item's comments (although it will include child elements' comments), or indentation.
     */
    private InlineElementRaw(item: JsonItem): void {
        if (item.Type === JsonItemType.Array) {
            const padType = Formatter.GetPaddingType(item);
            this._buffer.Add(this._pads.ArrStart(padType));

            for (let i = 0; i < item.Children.length; ++i)
                this.InlineElement(item.Children[i], (i<item.Children.length-1), null);

            this._buffer.Add(this._pads.ArrEnd(padType));
        }
        else if (item.Type === JsonItemType.Object) {
            const padType = Formatter.GetPaddingType(item);
            this._buffer.Add(this._pads.ObjStart(padType));

            for (let i = 0; i < item.Children.length; ++i)
                this.InlineElement(item.Children[i], (i<item.Children.length-1), null);

            this._buffer.Add(this._pads.ObjEnd(padType));
        }
        else {
            this._buffer.Add(item.Value);
        }
    }

    /**
     * Adds this item's representation to the buffer inlined, formatted according to the given TableTemplate.
     */
    private InlineTableRowSegment(template: TableTemplate, item: JsonItem, includeTrailingComma: boolean,
                                  isWholeRow: boolean) {
        this.WritePrefixNameMiddle(item, template);

        const commaPos = this.GetTableCommaPosition(template, item);

        // If we're asked to include a comma, do it.  For internal segments, if we don't supply a comma, the padding
        // will work out elsewhere.  But if this segment is the whole row of a table, we need to supply a dummy
        // comma due to possible end-of-line comment complications.
        const commaType = (includeTrailingComma)
            ? this._pads.Comma
            : (isWholeRow)
                ? this._pads.DummyComma
                : "";

        this.InlineTableValue(template, item, commaPos, commaType);

        if (commaPos === CommaPosition.AfterValuePadding)
            this._buffer.Add(commaType);

        if (template.PostfixCommentLength > 0)
            this._buffer.Add(this._pads.Comment, item.PostfixComment);

        if (commaPos === CommaPosition.BeforeCommentPadding)
            this._buffer.Add(commaType);

        this._buffer.Spaces(template.PostfixCommentLength - item.PostfixCommentLength);

        if (commaPos === CommaPosition.AfterCommentPadding)
            this._buffer.Add(commaType);
    }

    /**
     * Where this row segment's comma goes relative to value padding and postfix-comment padding.
     * Line-style postfix comments consume the rest of the line, so they use the value-padding slots.
     * Block postfix comments occupy their own padded field, which adds the comment-padding slots.
     */
    private GetTableCommaPosition(template: TableTemplate, item: JsonItem): CommaPosition {
        const commaBeforePad = this.Options.TableCommaPlacement === TableCommaPlacement.BeforePadding
            || (this.Options.TableCommaPlacement === TableCommaPlacement.BeforePaddingExceptNumbers
                && template.Type !== TableColumnType.Number);

        const columnHasBlockPostfix = template.PostfixCommentLength > 0 && !template.IsAnyPostCommentLineStyle;
        if (!columnHasBlockPostfix)
            return commaBeforePad ? CommaPosition.BeforeValuePadding : CommaPosition.AfterValuePadding;

        if (item.PostfixCommentLength > 0)
            return commaBeforePad ? CommaPosition.BeforeCommentPadding : CommaPosition.AfterCommentPadding;

        // This segment has no postfix comment, but siblings do.  AfterPadding still wants the comma in the
        // comment field so it lines up; BeforePadding clings to the value.
        return commaBeforePad ? CommaPosition.BeforeValuePadding : CommaPosition.AfterCommentPadding;
    }

    /**
     * Writes this row segment's value, plus a comma if it belongs immediately after the value (before value
     * padding).  Number lists can embed that comma in their alignment padding, so it has to be supplied here
     * rather than after we return.
     */
    private InlineTableValue(template: TableTemplate, item: JsonItem, commaPos: CommaPosition, commaType: string): void {
        if (template.Children.length > 0 && item.Type !== JsonItemType.Null) {
            if (template.Type === TableColumnType.Array)
                this.InlineTableRawArray(template, item);
            else
                this.InlineTableRawObject(template, item);
            if (commaPos === CommaPosition.BeforeValuePadding)
                this._buffer.Add(commaType);

            // Special adjustment if the object/array is shorter than the literal "null".
            if (template.ShorterThanNullAdjustment > 0)
                this._buffer.Spaces(template.ShorterThanNullAdjustment);
        }
        else if (template.Type === TableColumnType.Number) {
            const numberCommaType = (commaPos === CommaPosition.BeforeValuePadding) ? commaType : "";
            template.FormatNumber(this._buffer, item, numberCommaType);
        }
        else {
            this.InlineElementRaw(item);
            if (commaPos === CommaPosition.BeforeValuePadding)
                this._buffer.Add(commaType);
            this._buffer.Spaces(template.CompositeValueLength - item.ValueLength);
        }
    }

    /**
     * Adds just this ARRAY's value inlined, not worrying about comments and prop names and stuff.
     */
    private InlineTableRawArray(template: TableTemplate, item: JsonItem) {
        this._buffer.Add(this._pads.ArrStart(template.PadType));
        for (let i = 0; i < template.Children.length; ++i) {
            const isLastInTemplate = (i === template.Children.length - 1);
            const isLastInArray = (i === item.Children.length - 1);
            const subItem = (i < item.Children.length) ? item.Children[i] : null;
            this.InlineOrPadTableRowSegment(template.Children[i], subItem, isLastInArray, isLastInTemplate);
        }
        this._buffer.Add(this._pads.ArrEnd(template.PadType));
    }

    /**
     * Adds just this OBJECT's value inlined, not worrying about comments and prop names and stuff.
     */
    private InlineTableRawObject(template: TableTemplate, item: JsonItem): void {
        function MatchingChild(temp: TableTemplate) {
            return item.Children.find(ch => ch.Name === temp.LocationInParent);
        }

        // For every property in the template, find the corresponding element in this object, if any.
        const matches = template.Children.map(sub => { return {tt: sub, ji: MatchingChild(sub)}; });

        // We need to know the last item in the sequence that has a real value, in order to make the commas work out.
        let lastNonNullIdx = matches.length - 1;
        while (lastNonNullIdx >= 0 && !matches[lastNonNullIdx].ji)
            lastNonNullIdx -= 1;

        this._buffer.Add(this._pads.ObjStart(template.PadType));
        for (let i = 0; i < matches.length; ++i) {
            const subTemplate = matches[i].tt;
            const subItem = matches[i].ji;
            const isLastInObject = (i === lastNonNullIdx);
            const isLastInTemplate = (i === matches.length - 1);
            this.InlineOrPadTableRowSegment(subTemplate, subItem ?? null, isLastInObject, isLastInTemplate);
        }
        this._buffer.Add(this._pads.ObjEnd(template.PadType));
    }

    /**
     * Writes a nested row segment, or enough spaces to stand in for a child the template expected but this
     * container does not have.  Dummy commas keep later segments aligned when the container is shorter than
     * the template (ragged arrays, omitted object keys).
     */
    private InlineOrPadTableRowSegment(subTemplate: TableTemplate, subItem: JsonItem | null, isLastInContainer: boolean,
                                       isLastInTemplate: boolean): void {
        if (subItem) {
            this.InlineTableRowSegment(subTemplate, subItem, !isLastInContainer, false);
            if (isLastInContainer && !isLastInTemplate)
                this._buffer.Add(this._pads.DummyComma);
        }
        else {
            this._buffer.Spaces(subTemplate.TotalLength);
            if (!isLastInTemplate)
                this._buffer.Add(this._pads.DummyComma);
        }
    }

    /**
     * Writes the prefix comment, property name, and optionally the middle comment.  If a template is provided,
     * each piece is padded to the corresponding column width.  This does not include indentation or the value.
     */
    private WritePrefixNameMiddle(item: JsonItem, template: TableTemplate | null, includeMiddleComment: boolean = true): void {
        if (template) {
            this.AddToBufferFixed(item.PrefixComment, item.PrefixCommentLength, template.PrefixCommentLength,
                this._pads.Comment, false);
            this.AddToBufferFixed(item.Name, item.NameLength, template.NameLength, this._pads.Colon,
                this.Options.ColonBeforePropNamePadding);
            if (includeMiddleComment)
                this.AddToBufferFixed(item.MiddleComment, item.MiddleCommentLength, template.MiddleCommentLength,
                    this._pads.Comment, false);
        }
        else {
            this.AddToBuffer(item.PrefixComment, item.PrefixCommentLength, this._pads.Comment);
            this.AddToBuffer(item.Name, item.NameLength, this._pads.Colon);
            if (includeMiddleComment)
                this.AddToBuffer(item.MiddleComment, item.MiddleCommentLength, this._pads.Comment);
        }
    }

    /**
     * Do the stuff that's the same for the start of every formatted item, like prefix comments, property
     * labels, colons, etc.  This does not include the initial indentation.
     * Returns the depth number to be used for everything after this.  In some cases, we print a prop label
     * on one line, and then the value on another, at a greater indentation level.
     */
    private StandardFormatStart(item: JsonItem, depth: number, parentTemplate: TableTemplate | null): number {
        // Write the middle comment here only if it fits on this line.  A multiline middle comment is handled
        // below, because it changes indentation for everything that follows.
        this.WritePrefixNameMiddle(item, parentTemplate,
            item.MiddleCommentLength > 0 && !item.MiddleCommentHasNewLine);

        if (item.MiddleCommentLength === 0 || !item.MiddleCommentHasNewLine)
            return depth;

        // If the middle comment requires multiple lines, start a new line and indent everything after this.
        const commentRows = Formatter.NormalizeMultilineComment(item.MiddleComment, Number.MAX_VALUE);
        this._buffer.EndLine(this._pads.EOL);

        for (const row of commentRows) {
            this.StartLine(depth + 1);
            this._buffer.Add(row).EndLine(this._pads.EOL);
        }

        this.StartLine(depth + 1);
        return depth + 1;
    }

    /**
     * Do the stuff that's usually the same for the end of all formatted items, like trailing commas and postfix
     * comments.  This does not include an EOL.
     */
    private StandardFormatEnd(item: JsonItem, includeTrailingComma: boolean): void {
        if (includeTrailingComma && item.IsPostCommentLineStyle)
            this._buffer.Add(this._pads.Comma);
        if (item.PostfixCommentLength > 0)
            this._buffer.Add(this._pads.Comment, item.PostfixComment);
        if (includeTrailingComma && !item.IsPostCommentLineStyle)
            this._buffer.Add(this._pads.Comma);
    }

    private AddToBuffer(value:string, valueWidth:number, separator:string) {
        if (valueWidth <= 0)
            return;
        this._buffer.Add(value, separator);
    }

    private AddToBufferFixed(value:string, valueWidth:number, fieldWidth:number, separator:string,
                             separatorBeforePadding:boolean) {
        if (fieldWidth <= 0)
            return;
        const padWidth = fieldWidth - valueWidth;
        if (separatorBeforePadding)
            this._buffer.Add(value, separator).Spaces(padWidth);
        else
            this._buffer.Add(value).Spaces(padWidth).Add(separator);
    }

    /**
     * Checks whether it's okay to write a closing bracket on the same line.
     */
    private CanCollapseContainerClose(container: JsonItem, padType: BracketPaddingType,
                                      includeTrailingComma: boolean): boolean {
        if (!this.Options.CollapseClosingBrackets)
            return false;

        if (container.Children.length === 0)
            return false;

        const lastItemInContainer = container.Children[container.Children.length - 1];
        const lastItemDisqualifies = lastItemInContainer.PostfixCommentLength > 0
            || !Formatter.IsElement(lastItemInContainer);
        if (lastItemDisqualifies)
            return false;

        const lineLengthIfCollapsed = this._currentLineLen
            + this._pads.EndLen(container.Type, padType)
            + ((includeTrailingComma) ? this._pads.CommaLen : 0);
        return lineLengthIfCollapsed <= this.Options.MaxTotalLineLength;
    }

    /**
     * Write a closing bracket - either on the same line or a new one.
     */
    private WriteNonInlineCloseBracket(item: JsonItem, depth: number, includeTrailingComma: boolean): void {
        const padTypeIfInline = Formatter.GetPaddingType(item);
        if (!this.CanCollapseContainerClose(item, padTypeIfInline, includeTrailingComma)) {
            this._buffer.EndLine(this._pads.EOL);
            this.StartLine(depth);
            this._buffer.Add(this._pads.End(item.Type, BracketPaddingType.Empty));
            this._currentLineLen = this.LinePrefixWidth(depth) + this._pads.EndLen(item.Type, BracketPaddingType.Empty);
            return;
        }

        this._buffer.Add(this._pads.End(item.Type, padTypeIfInline));
        this._currentLineLen += this._pads.EndLen(item.Type, padTypeIfInline);
    }

    /**
     * Write an opening bracket and either a newline plus indentation, or spaces to pad to the next indentation level.
     * An empty container never collapses its opening bracket.  (The C# library currently throws in that case.)
     */
    private WriteNonInlineOpeningBracket(item: JsonItem, depth: number, template: TableTemplate | null): void {
        // The first child can share the container's opening line when it would still begin at the same column as
        // the items on the following lines.  Tabs prevent that, because the first item would need spaces to line
        // up with rows that indent with a tab.  Standalone comments and blank lines don't collapse either.
        const padType = Formatter.GetPaddingType(item);
        const padLen = this.Options.IndentSpaces
            - this.PrefixNameMiddleLength(item, template)
            - this._pads.StartLen(item.Type, padType);
        const firstChild = item.Children.length > 0 ? item.Children[0] : undefined;
        const canCollapse = this.Options.CollapseOpeningBrackets
            && !this.Options.UseTabToIndent
            && firstChild !== undefined
            && Formatter.IsElement(firstChild)
            && padLen >= 0;

        if (canCollapse) {
            this._buffer.Add(this._pads.Start(item.Type, padType));
            this._buffer.Spaces(padLen);
            return;
        }

        this._buffer.Add(this._pads.Start(item.Type, BracketPaddingType.Empty));
        this._buffer.EndLine(this._pads.EOL);
        this.StartLine(depth);
    }

    /**
     * Add the prefix string and indent.
     */
    private StartLine(depth: number): void {
        this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depth));
    }

    /**
     * Figures out how much room is allowed for inlining at this indentation level, considering
     * MaxTotalLineLength, indentation size, and prefix string length.
     */
    private AvailableLineSpace(depth: number): number {
        return this.Options.MaxTotalLineLength - this.LinePrefixWidth(depth);
    }

    /**
     * Prefix string plus indentation, in the same units as AvailableLineSpace.  Matches the planner
     * (IndentSpaces per level) rather than the actual indent characters, so tab indents still reserve
     * IndentSpaces of budget.
     */
    private LinePrefixWidth(depth: number): number {
        return this._pads.PrefixStringLen + this.Options.IndentSpaces * depth;
    }

    /**
     * Display width of an inlined item as actually written by InlineElement, not including the line's prefix/indent.
     */
    private InlineElementLength(item: JsonItem, includeTrailingComma: boolean, parentTemplate: TableTemplate | null): number {
        return this.PrefixNameMiddleLength(item, parentTemplate)
            + item.ValueLength
            + this.TrailingCommaAndPostfixLength(item, includeTrailingComma);
    }

    /**
     * Length of the item's prefix and middle comments and prop name.
     */
    private PrefixNameMiddleLength(item: JsonItem, template: TableTemplate | null): number {
        if (template) {
            let width = 0;
            if (template.PrefixCommentLength > 0)
                width += template.PrefixCommentLength + this._pads.CommentLen;
            if (template.NameLength > 0)
                width += template.NameLength + this._pads.ColonLen;
            if (template.MiddleCommentLength > 0)
                width += template.MiddleCommentLength + this._pads.CommentLen;
            return width;
        }

        let itemWidth = 0;
        if (item.PrefixCommentLength > 0)
            itemWidth += item.PrefixCommentLength + this._pads.CommentLen;
        if (item.NameLength > 0)
            itemWidth += item.NameLength + this._pads.ColonLen;
        if (item.MiddleCommentLength > 0)
            itemWidth += item.MiddleCommentLength + this._pads.CommentLen;
        return itemWidth;
    }

    private TrailingCommaAndPostfixLength(item: JsonItem, includeTrailingComma: boolean): number {
        let width = 0;
        if (item.PostfixCommentLength > 0)
            width += this._pads.CommentLen + item.PostfixCommentLength;
        if (includeTrailingComma)
            width += this._pads.CommaLen;
        return width;
    }

    /**
     * Takes note of the current line position for the inline case.
     */
    private SetLineLengthAfterInlineItem(item: JsonItem, depth: number, includeTrailingComma: boolean,
                                         parentTemplate: TableTemplate | null): void {
        this._currentLineLen = this.LinePrefixWidth(depth)
            + this.InlineElementLength(item, includeTrailingComma, parentTemplate);
    }

    /**
     * After a primitive that may have pushed its value onto a new line (multiline middle comment),
     * record the width of whatever line the value ended on.
     */
    private SetLineWidthAfterPossiblySplitItem(item: JsonItem, originalDepth: number, depthAfterColon: number,
                                               includeTrailingComma: boolean, parentTemplate: TableTemplate | null): void {
        if (depthAfterColon === originalDepth) {
            this.SetLineLengthAfterInlineItem(item, originalDepth, includeTrailingComma, parentTemplate);
            return;
        }

        this._currentLineLen = this.LinePrefixWidth(depthAfterColon) + item.ValueLength
            + this.TrailingCommaAndPostfixLength(item, includeTrailingComma);
    }

    private static GetPaddingType(arrOrObj: JsonItem): BracketPaddingType {
        if (arrOrObj.Children.length===0)
            return BracketPaddingType.Empty;

        return (arrOrObj.Complexity >= 2)? BracketPaddingType.Complex : BracketPaddingType.Simple;
    }

    /**
     * Returns a multiline comment string as an array of strings where newlines have been removed and leading space
     * on each line has been trimmed as smartly as possible.
     */
    private static NormalizeMultilineComment(comment: string, firstLineColumn: number): string[] {
        // Split the comment into separate lines, and get rid of that nasty \r\n stuff.  We'll write the
        // line endings that the user wants ourselves.
        const normalized = comment.replace(/\r/g, "");
        const commentRows = normalized.split("\n")
            .filter(line => line.length>0);

        /*
         * The first line doesn't include any leading whitespace, but subsequent lines probably do.
         * We want to remove leading whitespace from those rows, but only up to where the first line began.
         * The idea is to preserve spaces used to line up comments, like the ones before the asterisks
         * in THIS VERY COMMENT that you're reading RIGHT NOW.
         */
        for (let i=1; i<commentRows.length; ++i) {
            const line = commentRows[i];

            let nonWsIdx = 0;
            while (nonWsIdx < line.length && nonWsIdx < firstLineColumn && /\s/.test(line[nonWsIdx]))
                nonWsIdx += 1;

            commentRows[i] = line.substring(nonWsIdx);
        }

        return commentRows;
    }

    /**
     * True if the item is a real JSON value (as opposed to a standalone comment or blank line).
     */
    private static IsElement(item: JsonItem): boolean {
        return item.Type !== JsonItemType.BlankLine
            && item.Type !== JsonItemType.BlockComment
            && item.Type !== JsonItemType.LineComment;
    }

    private static IndexOfLastElement(itemList: JsonItem[]) {
        for (let i = itemList.length-1; i>=0; --i) {
            if (this.IsElement(itemList[i]))
                return i;
        }

        return -1;
    }

    private MinifyTopLevel(docModel: JsonItem[], buffer: IBuffer) {
        this._buffer = buffer;
        this._pads = new PaddedFormattingTokens(this.Options, this.StringLengthFunc);

        let atStartOfNewLine = true;
        for (const item of docModel)
            atStartOfNewLine = this.MinifyItem(item, atStartOfNewLine);

        this._buffer = new StringJoinBuffer();
    }

    /**
     * Recursively write a minified version of the item to the buffer, while preserving comments.
     */
    private MinifyItem(item: JsonItem, atStartOfNewLine: boolean): boolean {
        const newline = "\n";
        this._buffer.Add(item.PrefixComment);
        if (item.Name.length > 0)
            this._buffer.Add(item.Name, ":");

        if (item.MiddleComment.indexOf(newline) >= 0) {
            const normalizedComment = Formatter.NormalizeMultilineComment(item.MiddleComment, Number.MAX_VALUE);
            for (const line of normalizedComment)
                this._buffer.Add(line, newline);
        }
        else {
            this._buffer.Add(item.MiddleComment);
        }

        if (item.Type === JsonItemType.Array || item.Type === JsonItemType.Object) {
            let closeBracket: string;
            if (item.Type === JsonItemType.Array) {
                this._buffer.Add("[");
                closeBracket = "]";
            }
            else {
                this._buffer.Add("{");
                closeBracket = "}";
            }

            // Loop through children.  Print commas when needed.  Keep track of when we've started a new line -
            // that's important for blank lines.
            let needsComma = false;
            let atStartOfNewLine = false;
            for (const child of item.Children) {
                if (Formatter.IsElement(child)) {
                    if (needsComma)
                        this._buffer.Add(",");
                    needsComma = true;
                }
                atStartOfNewLine = this.MinifyItem(child, atStartOfNewLine);
            }
            this._buffer.Add(closeBracket);
        }
        else if (item.Type === JsonItemType.BlankLine) {
            // Make sure we're starting on a new line before inserting a blank line.  Otherwise, some can be lost.
            if (!atStartOfNewLine)
                this._buffer.Add(newline);
            this._buffer.Add(newline);
            return true;
        }
        else if (item.Type === JsonItemType.LineComment) {
            // Make sure we start on a new line for the comment, so that it will definitely be parsed as standalone.
            if (!atStartOfNewLine)
                this._buffer.Add(newline);
            this._buffer.Add(item.Value, newline);
            return true;
        }
        else if (item.Type === JsonItemType.BlockComment) {
            // Make sure we start on a new line for the comment, so that it will definitely be parsed as standalone.
            if (!atStartOfNewLine)
                this._buffer.Add(newline);

            if (item.Value.indexOf(newline)>=0) {
                const normalizedComment = Formatter.NormalizeMultilineComment(item.Value, item.InputPosition.Column);
                for (const line of normalizedComment)
                    this._buffer.Add(line, newline);
                return true;
            }

            this._buffer.Add(item.Value, newline);
            return true;
        }
        else {
            this._buffer.Add(item.Value);
        }

        this._buffer.Add(item.PostfixComment);
        if (item.PostfixComment.length>0 && item.IsPostCommentLineStyle) {
            this._buffer.Add(newline);
            return true;
        }

        return false;
    }

    /**
     * Divide the children of this item up into groups, some of which might make good tables.
     */
    private DivideContainerIntoSegments(item: JsonItem, depth: number): ContainerRun[] {
        if (depth < this.Options.AlwaysExpandDepth)
            return [{ startIndex: 0, length: item.Children.length, canBeTable: false }];

        const availableSpace = this.AvailableLineSpace(depth);
        if (!this.Options.AllowTableSegments) {
            const canBeTable = item.Children.every(child => this.CanBeTableRow(child, availableSpace));
            return [{ startIndex: 0, length: item.Children.length, canBeTable }];
        }

        const runs: ContainerRun[] = [];
        let runStartIndex = -1;
        let runCanBeTable = false;
        for (let i = 0; i < item.Children.length; ++i) {
            const child = item.Children[i];
            const canBeTable = this.CanBeTableRow(child, availableSpace);

            if (runStartIndex < 0) {
                runStartIndex = i;
                runCanBeTable = canBeTable;
            }

            // Only divide the run if we switch between table eligible or not.
            if (canBeTable !== runCanBeTable) {
                runs.push({ startIndex: runStartIndex, length: i - runStartIndex, canBeTable: runCanBeTable });
                runStartIndex = i;
                runCanBeTable = canBeTable;
            }
        }
        if (runStartIndex >= 0) {
            runs.push({
                startIndex: runStartIndex,
                length: item.Children.length - runStartIndex,
                canBeTable: runCanBeTable,
            });
        }
        return runs;
    }

    /**
     * Decides whether the given item can be a row in a table under the current settings.
     */
    private CanBeTableRow(item: JsonItem, availableSpace: number): boolean {
        let canBeTable: boolean;
        switch (item.Type) {
            case JsonItemType.BlankLine:
                canBeTable = !this.Options.SplitTableSegmentsAtBlankLines;
                break;
            case JsonItemType.BlockComment:
            case JsonItemType.LineComment:
                canBeTable = !this.Options.SplitTableSegmentsAtComments;
                break;
            default:
                canBeTable = !item.RequiresMultipleLines;
                break;
        }
        return canBeTable
            && item.Complexity <= this.Options.MaxTableRowComplexity
            && item.MinimumTotalLength <= availableSpace;
    }
}

interface ContainerRun {
    startIndex: number;
    length: number;
    canBeTable: boolean;
}

enum CommaPosition
{
    BeforeValuePadding,
    AfterValuePadding,
    BeforeCommentPadding,
    AfterCommentPadding,
}
