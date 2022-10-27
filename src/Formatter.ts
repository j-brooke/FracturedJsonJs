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

        return buffer.AsString();
    }

    /**
     * Writes a version of the given JSON (or JSON-with-comments) text that has all unnecessary space removed while
     * still preserving comments and blank lines, if that's what the settings require.
     * @param jsonText a JSON document in text form that should be reformatted
     * @constructor
     */
    Minify(jsonText:string): string {
        const buffer = new StringJoinBuffer();
        const parser = new Parser();
        parser.Options = this.Options;
        const docModel = parser.ParseTopLevel(jsonText, true);
        this.MinifyTopLevel(docModel, buffer);

        return buffer.AsString();
    }

    private _buffer:IBuffer = new StringJoinBuffer();
    private _pads:PaddedFormattingTokens =
        new PaddedFormattingTokens(new FracturedJsonOptions(), Formatter.StringLengthByCharCount);

    private FormatTopLevel(docModel: JsonItem[], startingDepth: number, buffer: IBuffer): void {
        this._buffer = buffer;
        this._pads = new PaddedFormattingTokens(this.Options, this.StringLengthFunc);

        for (const item of docModel) {
            this.ComputeItemLengths(item);
            this.FormatItem(item, startingDepth, false);
        }

        this._buffer = new StringJoinBuffer();
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
     * Runs StringLengthFunc on every part of every item and stores the value.  Also computes the total minimum
     * length, which for arrays and objects includes their child lengths.  We're going to use these values a lot,
     * and we don't want to run StringLengthFunc more than needed in case it's expensive.
     */
    private ComputeItemLengths(item: JsonItem): void {
        const newline = "\n";
        for (const child of item.Children)
            this.ComputeItemLengths(child);

        item.NameLength = this.StringLengthFunc(item.Name);
        item.ValueLength = this.StringLengthFunc(item.Value);
        item.PrefixCommentLength = this.StringLengthFunc(item.PrefixComment);
        item.MiddleCommentLength = this.StringLengthFunc(item.MiddleComment);
        item.PostfixCommentLength = this.StringLengthFunc(item.PostfixComment);

        item.RequiresMultipleLines =
            Formatter.IsCommentOrBlankLine(item.Type)
            || item.Children.some(ch => ch.RequiresMultipleLines || ch.IsPostCommentLineStyle)
            || item.PrefixComment.indexOf(newline) >= 0
            || item.MiddleComment.indexOf(newline) >= 0
            || item.PostfixComment.indexOf(newline) >= 0
            || item.Value.indexOf(newline) >= 0;

        if (item.Type == JsonItemType.Array || item.Type == JsonItemType.Object) {
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
     * Adds a formatted version of any item to the buffer, including indentation and newlines as needed.  This
     * could span multiple lines.
     */
    private FormatItem(item: JsonItem, depth: number, includeTrailingComma: boolean): void {
        switch (item.Type) {
            case JsonItemType.Array:
            case JsonItemType.Object:
                this.FormatContainer(item, depth, includeTrailingComma);
                break;
            case JsonItemType.BlankLine:
                this.FormatBlankLine();
                break;
            case JsonItemType.BlockComment:
            case JsonItemType.LineComment:
                this.FormatStandaloneComment(item, depth);
                break;
            default:
                if (item.RequiresMultipleLines)
                    this.FormatSplitKeyValue(item, depth, includeTrailingComma);
                else
                    this.FormatInlineElement(item, depth, includeTrailingComma);
                break;
        }
    }

    /**
     * Adds the representation for an array or object to the buffer, including all necessary indents, newlines, etc.
     * The array/object might be formatted inline, compact multiline, table, or expanded, according to circumstances.
     */
    private FormatContainer(item: JsonItem, depth: number, includeTrailingComma: boolean): void {
        // Try to inline or compact-multiline format, as long as we're deeper than AlwaysExpandDepth.  Of course,
        // there may be other disqualifying factors that are discovered along the way.
        if (depth > this.Options.AlwaysExpandDepth) {
            if (this.FormatContainerInline(item, depth, includeTrailingComma))
                return;
            if (this.FormatContainerCompactMultiline(item, depth, includeTrailingComma))
                return;
        }

        // Allow table formatting at the specified depth, too.  So if this is a root level array and
        // AlwaysExpandDepth=0, we can table format it.  But if AlwaysExpandDepth=1, we can't format the root
        // as a table, since a table's children are always inlined (and thus not expanded).
        if (depth >= this.Options.AlwaysExpandDepth) {
            if (this.FormatContainerTable(item, depth, includeTrailingComma))
                return;
        }

        this.FormatContainerExpanded(item, depth, includeTrailingComma);
    }


    /**
     * Tries to add the representation for an array or object to the buffer, including all necessary indents, newlines,
     * etc., if the array/object qualifies.
     * Returns true if the content was added.
     */
    private FormatContainerInline(item: JsonItem, depth: number, includeTrailingComma: boolean): boolean {
        if (item.RequiresMultipleLines)
            return false;
        const lengthToConsider = item.MinimumTotalLength + ((includeTrailingComma)? this._pads.CommaLen : 0);
        if (item.Complexity > this.Options.MaxInlineComplexity || lengthToConsider > this.AvailableLineSpace(depth))
            return false;

        this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depth));
        this.InlineElement(item, includeTrailingComma);
        this._buffer.Add(this._pads.EOL);

        return true;
    }


    /**
     * Tries to add the representation of this array to the buffer, including indents and things, spanning multiple
     * lines but with each child written inline and several of them per line.
     * Returns true if the content was added
     */
    private FormatContainerCompactMultiline(item:JsonItem, depth:number, includeTrailingComma: boolean): boolean {
        if (item.Type != JsonItemType.Array)
            return false;
        if (item.Complexity > this.Options.MaxCompactArrayComplexity)
            return false;
        if (item.RequiresMultipleLines)
            return false;

        // If all items are alike, we'll want to format each element as if it were a table row.
        const template = new TableTemplate(this._pads, !this.Options.DontJustifyNumbers);
        template.MeasureTableRoot(item);

        const likelyAvailableLineSpace = this.AvailableLineSpace(depth + 1);
        let avgItemWidth = this._pads.CommaLen;
        if (template.IsRowDataCompatible)
            avgItemWidth += template.TotalLength;
        else
            avgItemWidth += (item.Children.map(ch => ch.MinimumTotalLength).reduce((p:number,c:number) => p+c, 0)
                / item.Children.length);
        if (avgItemWidth * this.Options.MinCompactArrayRowItems > likelyAvailableLineSpace)
            return false;

        // Add prefixString, indent, prefix comment, starting bracket (with no EOL).
        const depthAfterColon = this.StandardFormatStart(item, depth);
        this._buffer.Add(this._pads.Start(item.Type, BracketPaddingType.Empty));

        const availableLineSpace = this.AvailableLineSpace(depthAfterColon + 1);
        let remainingLineSpace = -1;
        for (let i=0; i<item.Children.length; ++i) {
            // Figure out whether the next item fits on the current line.  If not, start a new one.
            const child = item.Children[i];
            const needsComma = (i < item.Children.length - 1);
            const spaceNeededForNext = ((needsComma)? this._pads.CommaLen : 0)
                + ((template.IsRowDataCompatible)? template.TotalLength : child.MinimumTotalLength);

            if (remainingLineSpace < spaceNeededForNext) {
                this._buffer.Add(this._pads.EOL, this.Options.PrefixString, this._pads.Indent(depthAfterColon+1));
                remainingLineSpace = availableLineSpace;
            }

            // Write it out
            if (template.IsRowDataCompatible)
                this.InlineTableRowSegment(template, child, needsComma, false);
            else
                this.InlineElement(child, needsComma);
            remainingLineSpace -= spaceNeededForNext;
        }

        // The previous line won't have ended yet, so do a line feed and indent before the closing bracket.
        this._buffer.Add(this._pads.EOL, this.Options.PrefixString, this._pads.Indent(depthAfterColon),
            this._pads.End(item.Type, BracketPaddingType.Empty));

        this.StandardFormatEnd(item, includeTrailingComma);
        return true;
    }

    /**
     * Tries to format this array/object as a table.  That is, each of this JsonItem's children are each written
     * as a single line, with their pieces formatted to line up.  This only works if the structures and types
     * are consistent for all rows.  Returns true if the content was added.
     */
    private FormatContainerTable(item: JsonItem, depth: number, includeTrailingComma: boolean): boolean {
        // If this element's children are too complex to be written inline, don't bother.
        if (item.Complexity > this.Options.MaxTableRowComplexity + 1)
            return false;

        const availableSpace = this.AvailableLineSpace(depth + 1) - this._pads.CommaLen;

        // If any child element is too long even without formatting, don't bother.
        const isChildTooLong = item.Children.filter(ch => !Formatter.IsCommentOrBlankLine(ch.Type))
            .some(ch => ch.MinimumTotalLength > availableSpace);
        if (isChildTooLong)
            return false;

        // Create a helper object to measure how much space we'll need.  If this item's children aren't sufficiently
        // similar, IsRowDataCompatible will be false.
        const template = new TableTemplate(this._pads, !this.Options.DontJustifyNumbers);
        template.MeasureTableRoot(item);
        if (!template.IsRowDataCompatible)
            return false;

        // If the rows won't fit with everything (including descendents) tabular, try dropping the columns for
        // the deepest nested items, repeatedly, until it either fits or we give up.
        //
        // For instance, here's an example of what fully tabular would look like:
        // [
        //     { "a":   3, "b": { "x": 19, "y":  -4           } },
        //     { "a": 147, "b": {          "y": 111, "z": -99 } }
        // ]
        // If that doesn't work, we try this:
        // [
        //     { "a":   3, "b": { "x": 19, "y": -4 }   },
        //     { "a": 147, "b": { "y": 111, "z": -99 } }
        // ]
        if (!template.TryToFit(availableSpace))
            return false;

        const depthAfterColon = this.StandardFormatStart(item, depth);
        this._buffer.Add(this._pads.Start(item.Type, BracketPaddingType.Empty), this._pads.EOL);

        // Take note of the position of the last actual element, for comma decisions.  The last element
        // might not be the last item.
        const lastElementIndex = Formatter.IndexOfLastElement(item.Children);
        for (let i=0; i<item.Children.length; ++i) {
            const rowItem = item.Children[i];
            if (rowItem.Type == JsonItemType.BlankLine) {
                this.FormatBlankLine();
                continue;
            }
            if (rowItem.Type == JsonItemType.LineComment || rowItem.Type == JsonItemType.BlockComment) {
                this.FormatStandaloneComment(rowItem, depthAfterColon+1);
                continue;
            }

            this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depthAfterColon+1));
            this.InlineTableRowSegment(template, rowItem, (i<lastElementIndex), true);
            this._buffer.Add(this._pads.EOL)
        }

        this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depthAfterColon),
            this._pads.End(item.Type, BracketPaddingType.Empty));
        this.StandardFormatEnd(item, includeTrailingComma);

        return true;
    }

    /**
     * Adds the representation for an array or object to the buffer, including all necessary indents, newlines, etc.,
     * broken out on separate lines.  This is the most general case that always works.
     */
    private FormatContainerExpanded(item: JsonItem, depth: number, includeTrailingComma: boolean): void {
        const depthAfterColon = this.StandardFormatStart(item, depth);
        this._buffer.Add(this._pads.Start(item.Type, BracketPaddingType.Empty), this._pads.EOL);

        const lastElementIndex = Formatter.IndexOfLastElement(item.Children);
        for (let i=0; i<item.Children.length; ++i)
            this.FormatItem(item.Children[i], depthAfterColon+1, (i<lastElementIndex));

        this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depthAfterColon),
            this._pads.End(item.Type, BracketPaddingType.Empty));
        this.StandardFormatEnd(item, includeTrailingComma);
    }

    /**
     * Adds a (possibly multiline) standalone comment to the buffer, with indents and newlines on each line.
     */
    private FormatStandaloneComment(item: JsonItem, depth: number): void {
        const commentRows = Formatter.NormalizeMultilineComment(item.Value, item.InputPosition.Column);

        for (const line of commentRows)
            this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depth), line, this._pads.EOL);
    }

    private FormatBlankLine(): void {
        this._buffer.Add(this.Options.PrefixString, this._pads.EOL);
    }

    /**
     * Adds an element to the buffer that can be written as a single line, including indents and newlines.
     */
    private FormatInlineElement(item: JsonItem, depth: number, includeTrailingComma: boolean): void {
        this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depth));
        this.InlineElement(item, includeTrailingComma);
        this._buffer.Add(this._pads.EOL);
    }

    /**
     *  Adds an item to the buffer, including comments and indents and such, where a comment between the
     *  prop name and prop value needs to span multiple lines.
     */
    private FormatSplitKeyValue(item: JsonItem, depth:number, includeTrailingComma: boolean): void {
        this.StandardFormatStart(item, depth);
        this._buffer.Add(item.Value);
        this.StandardFormatEnd(item, includeTrailingComma);
    }

    /**
     * Do the stuff that's the same for the start of every formatted item, like indents and prefix comments.
     * Returns the depth number to be used for everything after this.  In some cases, we print a prop label
     * on one line, and then the value on another, at a greater indentation level.
     */
    private StandardFormatStart(item: JsonItem, depth: number): number {
        // Everything is straightforward until the colon
        this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depth));
        if (item.PrefixCommentLength > 0)
            this._buffer.Add(item.PrefixComment, this._pads.Comment);

        if (item.NameLength > 0)
            this._buffer.Add(item.Name, this._pads.Colon);

        if (item.MiddleCommentLength == 0)
            return depth;

        // If there's a middle comment, we write it on the same line and move along.  Easy.
        if (item.MiddleComment.indexOf("\n") < 0) {
            this._buffer.Add(item.MiddleComment, this._pads.Comment);
            return depth;
        }

        // If the middle comment requires multiple lines, start a new line and indent everything after this.
        const commentRows = Formatter.NormalizeMultilineComment(item.MiddleComment, Number.MAX_VALUE);
        this._buffer.Add(this._pads.EOL);

        for (const row of commentRows)
            this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depth+1), row, this._pads.EOL);

        this._buffer.Add(this.Options.PrefixString, this._pads.Indent(depth+1));
        return depth + 1;
    }

    /**
     * Do the stuff that's usually the same for the end of all formatted items, like trailing commas and postfix
     * comments.
     */
    private StandardFormatEnd(item: JsonItem, includeTrailingComma: boolean): void {
        if (includeTrailingComma && item.IsPostCommentLineStyle)
            this._buffer.Add(this._pads.Comma);
        if (item.PostfixCommentLength > 0)
            this._buffer.Add(this._pads.Comment, item.PostfixComment);
        if (includeTrailingComma && !item.IsPostCommentLineStyle)
            this._buffer.Add(this._pads.Comma);
        this._buffer.Add(this._pads.EOL);
    }

    /**
     * Adds the inline representation of this item to the buffer.  This includes all of this element's
     * comments and children when appropriate.  It DOES NOT include indentation, newlines, or any of that.  This
     * should only be called if item.RequiresMultipleLines is false.
     */
    private InlineElement(item: JsonItem, includeTrailingComma: boolean): void {
        if (item.RequiresMultipleLines)
            throw new FracturedJsonError("Logic error - trying to inline invalid element");

        if (item.PrefixCommentLength > 0)
            this._buffer.Add(item.PrefixComment, this._pads.Comment);

        if (item.NameLength > 0)
            this._buffer.Add(item.Name, this._pads.Colon);

        if (item.MiddleCommentLength > 0)
            this._buffer.Add(item.MiddleComment, this._pads.Comment);

        this.InlineElementRaw(item);

        if (includeTrailingComma && item.IsPostCommentLineStyle)
            this._buffer.Add(this._pads.Comma);
        if (item.PostfixCommentLength > 0)
            this._buffer.Add(this._pads.Comment, item.PostfixComment);
        if (includeTrailingComma && !item.IsPostCommentLineStyle)
            this._buffer.Add(this._pads.Comma);
    }

    /**
     * Adds just this element's value to be buffer, inlined.  (Possibly recursively.)  This does not include
     * the item's comments (although it will include child elements' comments), or indentation.
     */
    private InlineElementRaw(item: JsonItem): void {
        if (item.Type == JsonItemType.Array) {
            const padType = Formatter.GetPaddingType(item);
            this._buffer.Add(this._pads.ArrStart(padType));

            for (let i = 0; i < item.Children.length; ++i)
                this.InlineElement(item.Children[i], (i<item.Children.length-1));

            this._buffer.Add(this._pads.ArrEnd(padType));
        }
        else if (item.Type == JsonItemType.Object) {
            const padType = Formatter.GetPaddingType(item);
            this._buffer.Add(this._pads.ObjStart(padType));

            for (let i = 0; i < item.Children.length; ++i)
                this.InlineElement(item.Children[i], (i<item.Children.length-1));

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
        if (template.PrefixCommentLength > 0)
            this._buffer.Add(item.PrefixComment,
                this._pads.Spaces(template.PrefixCommentLength - item.PrefixCommentLength),
                this._pads.Comment);

        if (template.NameLength > 0)
            this._buffer.Add(item.Name,
                this._pads.Spaces(template.NameLength - item.NameLength),
                this._pads.Colon);

        if (template.MiddleCommentLength > 0)
            this._buffer.Add(item.MiddleComment,
                this._pads.Spaces(template.MiddleCommentLength - item.MiddleCommentLength),
                this._pads.Comment);

        if (template.Children.length > 0 && item.Type != JsonItemType.Null) {
            if (template.Type == JsonItemType.Array)
                this.InlineTableRawArray(template, item);
            else
                this.InlineTableRawObject(template, item);
        }
        else if (template.IsFormattableNumber && item.Type != JsonItemType.Null) {
            this._buffer.Add(template.FormatNumber(item.Value));
        }
        else {
            this.InlineElementRaw(item);
            this._buffer.Add(this._pads.Spaces(template.CompositeValueLength - item.ValueLength));
        }

        // If there's a postfix line comment, the comma needs to happen first.  For block comments,
        // it would be better to put the comma after the comment.
        const commaGoesBeforeComment = item.IsPostCommentLineStyle || item.PostfixCommentLength == 0;
        if (commaGoesBeforeComment) {
            // For internal row segments, there won't be trailing comments for any of the rows.  But
            // if this is a whole row, then there will be commas after all but the last one.  So,
            // if this is a whole row and it doesn't need a comma, then it needs padding to match
            // the ones above.
            if (includeTrailingComma)
                this._buffer.Add(this._pads.Comma);
            else if (isWholeRow)
                this._buffer.Add(this._pads.DummyComma);
        }

        if (template.PostfixCommentLength > 0)
            this._buffer.Add(this._pads.Comment,
                item.PostfixComment,
                this._pads.Spaces(template.PostfixCommentLength - item.PostfixCommentLength));

        if (!commaGoesBeforeComment) {
            if (includeTrailingComma)
                this._buffer.Add(this._pads.Comma);
            else if (isWholeRow)
                this._buffer.Add(this._pads.DummyComma);
        }
    }


    /**
     * Adds just this ARRAY's value inlined, not worrying about comments and prop names and stuff.
     */
    private InlineTableRawArray(template: TableTemplate, item: JsonItem) {
        this._buffer.Add(this._pads.ArrStart(template.PadType));
        for (let i = 0; i < template.Children.length; ++i) {
            const isLastInTemplate = (i == template.Children.length - 1);
            const isLastInArray = (i == item.Children.length -1);
            const isPastEndOfArray = (i >= item.Children.length);
            const subTemplate = template.Children[i];

            if (isPastEndOfArray) {
                // We're done writing this array's children out.  Now we just need to add space to line up with others.
                this._buffer.Add(this._pads.Spaces(subTemplate.TotalLength));
                if (!isLastInTemplate)
                    this._buffer.Add(this._pads.DummyComma);
            }
            else {
                this.InlineTableRowSegment(subTemplate, item.Children[i], !isLastInArray, false);
                if (isLastInArray && !isLastInTemplate)
                    this._buffer.Add(this._pads.DummyComma);
            }
        }
        this._buffer.Add(this._pads.ArrEnd(template.PadType));
    }

    /**
     * Adds just this OBJECT's value inlined, not worrying about comments and prop names and stuff.
     */
    private InlineTableRawObject(template: TableTemplate, item: JsonItem): void {
        function MatchingChild(temp: TableTemplate) {
            return item.Children.find(ch => ch.Name == temp.LocationInParent);
        }

        // For every property in the template, find the corresponding element in this object, if any.
        const matches = template.Children.map(sub => { return {tt: sub, ji: MatchingChild(sub)}; });

        // We need to know the last item in the sequence that has a real value, in order to make the commas work out.
        let lastNonNullIdx = matches.length - 1;
        while (lastNonNullIdx >= 0 && !matches[lastNonNullIdx].ji)
            lastNonNullIdx -= 1;

        this._buffer.Add(this._pads.ObjStart(template.PadType));
        for (let i=0; i < matches.length; ++i) {
            const subTemplate = matches[i].tt;
            const subItem = matches[i].ji;
            const isLastInObject = (i == lastNonNullIdx);
            const isLastInTemplate = (i == matches.length - 1);
            if (subItem) {
                this.InlineTableRowSegment(subTemplate, subItem, !isLastInObject, false);
                if (isLastInObject && !isLastInTemplate)
                    this._buffer.Add(this._pads.DummyComma);
            }
            else {
                this._buffer.Add(this._pads.Spaces(subTemplate.TotalLength));
                if (!isLastInTemplate)
                    this._buffer.Add(this._pads.DummyComma);
            }
        }
        this._buffer.Add(this._pads.ObjEnd(template.PadType));
    }

    private AvailableLineSpace(depth: number): number {
        return Math.min(this.Options.MaxInlineLength,
            this.Options.MaxTotalLineLength - this._pads.PrefixStringLen - this.Options.IndentSpaces * depth);
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

        if (item.Type == JsonItemType.Array || item.Type == JsonItemType.Object) {
            let closeBracket: string;
            if (item.Type == JsonItemType.Array) {
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
                if (!Formatter.IsCommentOrBlankLine(child.Type)) {
                    if (needsComma)
                        this._buffer.Add(",");
                    needsComma = true;
                }
                atStartOfNewLine = this.MinifyItem(child, atStartOfNewLine);
            }
            this._buffer.Add(closeBracket);
        }
        else if (item.Type == JsonItemType.BlankLine) {
            // Make sure we're starting on a new line before inserting a blank line.  Otherwise some can be lost.
            if (!atStartOfNewLine)
                this._buffer.Add(newline);
            this._buffer.Add(newline);
            return true;
        }
        else if (item.Type == JsonItemType.LineComment) {
            // Make sure we start on a new line for the comment, so that it will definitely be parsed as standalone.
            if (!atStartOfNewLine)
                this._buffer.Add(newline);
            this._buffer.Add(item.Value, newline);
            return true;
        }
        else if (item.Type == JsonItemType.BlockComment) {
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

    private static GetPaddingType(arrOrObj: JsonItem): BracketPaddingType {
        if (arrOrObj.Children.length==0)
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

    private static IndexOfLastElement(itemList: JsonItem[]) {
        for (let i = itemList.length-1; i>=0; --i) {
            if (!this.IsCommentOrBlankLine(itemList[i].Type))
                return i;
        }

        return -1;
    }

    private static IsCommentOrBlankLine(type: JsonItemType): boolean {
        return type == JsonItemType.BlankLine || type == JsonItemType.BlockComment || type == JsonItemType.LineComment;
    }
}
