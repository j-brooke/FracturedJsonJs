import * as eaw from 'eastasianwidth';

/*
 * FracturedJsonJs
 * FracturedJsonJs is a library for formatting JSON documents in a human-readable but fairly compact way.
 *
 * Copyright (c) 2021 Jesse Brooke
 * Project site: https://github.com/j-brooke/FracturedJsonJs
 * License: https://github.com/j-brooke/FracturedJsonJs/blob/main/LICENSE
 */

/*
 * Class that outputs JSON formatted in a compact, user-readable way.  Any given container is formatted in one
 * of three ways:
 *   * Arrays or objects will be written on a single line, if their contents aren't too complex and the
 *     resulting line wouldn't be too long.
 *   * Arrays can be written on multiple lines, with multiple items per line, as long as those items aren't
 *     too complex.
 *   * Otherwise, each object property or array item is written beginning on its own line, indented one step
 *     deeper than its parent.
 */
export class Formatter {
    /**
     * Dictates what sort of line endings to use.
     */
    get jsonEolStyle(): EolStyle {
        return this._jsonEolStyle;
    }
    set jsonEolStyle(value: EolStyle) {
        this._jsonEolStyle = value;
    }

    /**
     * Maximum length of a complex element on a single line.  This includes only the data for the inlined element,
     * not indentation or leading property names.
     */
    get maxInlineLength(): number {
        return this._maxInlineLength;
    }
    set maxInlineLength(value: number) {
        this._maxInlineLength = value;
    }

    /**
     * Maximum nesting level that can be displayed on a single line.  A primitive type or an empty
     * array or object has a complexity of 0.  An object or array has a complexity of 1 greater than
     * its most complex child.
     */
    get maxInlineComplexity(): number {
        return this._maxInlineComplexity;
    }
    set maxInlineComplexity(value: number) {
        this._maxInlineComplexity = value;
    }

    /**
     * Maximum nesting level that can be arranged spanning multiple lines, with multiple items per line.
     */
    get maxCompactArrayComplexity(): number {
        return this._maxCompactArrayComplexity;
    }
    set maxCompactArrayComplexity(value: number) {
        this._maxCompactArrayComplexity = value;
    }

    /**
     * If an inlined array or object contains other arrays or objects, setting NestedBracketPadding to true
     * will include spaces inside the outer brackets.  (See also simpleBracketPadding)
     */
    get nestedBracketPadding(): boolean {
        return this._nestedBracketPadding;
    }
    set nestedBracketPadding(value: boolean) {
        this._nestedBracketPadding = value;
    }

    /**
     * If an inlined array or object does NOT contain other arrays/objects, setting SimpleBracketPadding to true
     * will include spaces inside the brackets.  (See also nestedBracketPadding)
     */
    get simpleBracketPadding(): boolean {
        return this._simpleBracketPadding;
    }
    set simpleBracketPadding(value: boolean) {
        this._simpleBracketPadding = value;
    }

    /**
     * If true, includes a space after property colons.
     */
    get colonPadding(): boolean {
        return this._colonPadding;
    }
    set colonPadding(value: boolean) {
        this._colonPadding = value;
    }

    /**
     * If true, includes a space after commas separating array items and object properties.
     */
    get commaPadding(): boolean {
        return this._commaPadding;
    }
    set commaPadding(value: boolean) {
        this._commaPadding = value;
    }

    /**
     * Depth at which lists/objects are always fully expanded, regardless of other settings.
     * -1 = none; 0 = root node only; 1 = root node and its children.
     */
    get alwaysExpandDepth(): number {
        return this._alwaysExpandDepth;
    }
    set alwaysExpandDepth(value: number) {
        this._alwaysExpandDepth = value;
    }

    /**
     * Number of spaces to use per indent level (unless UseTabToIndent is true)
     */
    get indentSpaces(): number {
        return this._indentSpaces;
    }
    set indentSpaces(value: number) {
        this._indentSpaces = value;
    }

    /**
     * Uses a single tab per indent level, instead of spaces.
     */
    get useTabToIndent(): boolean {
        return this._useTabToIndent;
    }
    set useTabToIndent(value: boolean) {
        this._useTabToIndent = value;
    }

    /**
     * Value from 0 to 100 indicating how similar collections of inline objects need to be to be formatted as
     * a table.  A group of objects that don't have any property names in common has a similarity of zero.  A
     * group of objects that all contain the exact same property names has a similarity of 100.  Setting this
     * to a value &gt;100 disables table formatting with objects as rows.
     */
    get tableObjectMinimumSimilarity(): number {
        return this._tableObjectMinimumSimilarity;
    }
    set tableObjectMinimumSimilarity(value: number) {
        this._tableObjectMinimumSimilarity = value;
    }

    /**
     * Value from 0 to 100 indicating how similar collections of inline arrays need to be to be formatted as
     * a table.  Similarity for arrays refers to how similar they are in length; if they all have the same
     * length their similarity is 100.  Setting this to a value &gt;100 disables table formatting with arrays as
     * rows.
     */
    get tableArrayMinimumSimilarity(): number {
        return this._tableArrayMinimumSimilarity;
    }
    set tableArrayMinimumSimilarity(value: number) {
        this._tableArrayMinimumSimilarity = value;
    }

    /**
     * If true, property names of expanded objects are padded to the same size.
     */
    get alignExpandedPropertyNames(): boolean {
        return this._alignExpandedPropertyNames;
    }
    set alignExpandedPropertyNames(value: boolean) {
        this._alignExpandedPropertyNames = value;
    }

    /**
     * If true, numbers won't be right-aligned with matching precision.
     */
    get dontJustifyNumbers(): boolean {
        return this._dontJustifyNumbers;
    }
    set dontJustifyNumbers(value: boolean) {
        this._dontJustifyNumbers = value;
    }

    /**
     * String attached to the beginning of every line, before regular indentation.
     */
    get prefixString(): string {
        return this._prefixString;
    }
    set prefixString(value: string) {
        this._prefixString = value;
    }

    /**
     * Function that returns the visual width of strings measured in characters.  This is used to line
     * columns up when formatting objects/arrays as tables.  You can use the static methods
     * StringWidthByCharacterCount, StringWidthWithEastAsian, or supply your own.
     */
    get stringWidthFunc(): (s:string) => number {
        return this._stringWidthFunc;
    }
    set stringWidthFunc(value: (s:string) => number) {
        this._stringWidthFunc = value;
    }

    /**
     * Returns a JSON-formatted string that represents the given JavaScript value.
     * @param jsValue
     */
    serialize(jsValue: any): string {
        this.initInternals();
        return this._prefixString + this.formatElement(0, jsValue).Value;
    }

    /**
     * Returns the character count of the string (just like the String.length property).
     * See StringWidthFunc
     */
    static StringWidthByCharacterCount(str: string): number {
        return str.length;
    }

    /**
     * Returns a width, where some East Asian symbols are treated as twice as wide as Latin symbols.
     * See StringWidthFunc
     */
    static StringWidthWithEastAsian(str: string): number {
        return eaw.length(str);
    }

    private _jsonEolStyle: EolStyle = EolStyle.lf;
    private _maxInlineLength: number = 80;
    private _maxInlineComplexity: number = 2;
    private _maxCompactArrayComplexity: number = 1;
    private _nestedBracketPadding: boolean = true;
    private _simpleBracketPadding: boolean = false;
    private _colonPadding: boolean = true;
    private _commaPadding: boolean = true;
    private _alwaysExpandDepth: number = -1;
    private _indentSpaces: number = 4;
    private _useTabToIndent: boolean = false;
    private _tableObjectMinimumSimilarity: number = 75;
    private _tableArrayMinimumSimilarity: number = 75;
    private _alignExpandedPropertyNames: boolean = false;
    private _dontJustifyNumbers: boolean = false;
    private _prefixString: string = "";
    private _stringWidthFunc: (s: string) => number = Formatter.StringWidthWithEastAsian;

    private _eolStr: string = "";
    private _indentStr: string = "";
    private _paddedCommaStr: string = "";
    private _paddedColonStr: string = "";
    private _indentCache: string[] = [];

    /**
     * Set up some intermediate fields for efficiency.
     * @private
     */
    private initInternals() {
        this._eolStr = (this._jsonEolStyle === EolStyle.Crlf) ? "\r\n" : "\n";
        this._indentStr = (this._useTabToIndent) ? "\t" : " ".repeat(this._indentSpaces);
        this._paddedCommaStr = (this._commaPadding) ? ", " : ",";
        this._paddedColonStr = (this._colonPadding) ? ": " : ":";
    }

    private indent(buff: string[], depth: number) : string[] {
        if (!this._indentCache[depth])
            this._indentCache[depth] = this._indentStr.repeat(depth);
        buff.push(this._prefixString, this._indentCache[depth]);
        return buff;
    }

    private combine(buff: string[]): string {
        return buff.join('');
    }

    /**
     * Base of recursion.  Nearly everything comes through here.
     * @param depth
     * @param element
     * @private
     */
    private formatElement(depth: number, element: any): FormattedNode {
        let formattedItem : FormattedNode;
        if (Array.isArray(element))
            formattedItem = this.formatArray(depth, element);
        else if (element===null)
            formattedItem = this.formatSimple(depth, element);
        else if (typeof(element)==="object")
            formattedItem = this.formatObject(depth, element);
        else
            formattedItem = this.formatSimple(depth, element);

        formattedItem.cleanup();
        return formattedItem;
    }

    /**
     * Formats a JSON element other than an array or object.
     * @param depth
     * @param element
     * @private
     */
    private formatSimple(depth: number, element: any): FormattedNode {
        // Treat undefined as null.  (But note that in objects we skip them instead.)
        if (element===undefined)
            element = null;

        const simpleNode = new FormattedNode();
        simpleNode.Value = JSON.stringify(element);
        simpleNode.ValueLength = this._stringWidthFunc(simpleNode.Value);
        simpleNode.Complexity = 0;
        simpleNode.Depth = depth;

        if (element===null) {
            simpleNode.Kind = JsonValueKind.Null;
            return simpleNode;
        }

        switch (typeof(element)) {
            case "boolean":
                simpleNode.Kind = JsonValueKind.Boolean;
                break;
            case "number":
                simpleNode.Kind = JsonValueKind.Number;
                break;
            case "undefined":
                simpleNode.Kind = JsonValueKind.Null;
                break;
            default:
            case "string":
                simpleNode.Kind = JsonValueKind.String;
                break;
        }
        return simpleNode;
    }

    private formatArray(depth: number, element: any[]): FormattedNode {
        // Recursively format all of this array's elements.
        const items = element.map(child => this.formatElement(depth+1, child));
        if (items.length===0)
            return this.emptyArray(depth);

        const thisItem = new FormattedNode();
        thisItem.Kind = JsonValueKind.Array;
        thisItem.Complexity = Math.max(...items.map(fn => fn.Complexity)) + 1;
        thisItem.Depth = depth;
        thisItem.Children = items;

        if (thisItem.Depth > this._alwaysExpandDepth) {
            if (this.formatArrayInline(thisItem)) {
                return thisItem;
            }
        }

        this.justifyParallelNumbers(thisItem.Children);

        if (thisItem.Depth > this._alwaysExpandDepth) {
            if (this.formatArrayMultilineCompact(thisItem)) {
                return thisItem;
            }
        }

        if (this.formatTableArrayObject(thisItem))
            return thisItem;

        if (this.formatTableArrayArray(thisItem))
            return thisItem;

        this.formatArrayExpanded(thisItem);
        return thisItem;
    }

    private formatObject(depth: number, element: object): FormattedNode {
        // Recursively format all of this object's property values.
        const items: FormattedNode[] = [];
        for (const childKvp of Object.entries(element)) {
            // For objects, skip undefined values.  (Elsewhere we convert them to null instead.)
            if (childKvp[1]===undefined)
                continue;

            const elem = this.formatElement(depth+1, childKvp[1]);
            elem.Name = JSON.stringify(childKvp[0]);
            elem.NameLength = this._stringWidthFunc(elem.Name);
            items.push(elem);
        }
        if (items.length===0)
            return this.emptyObject(depth);

        const thisItem = new FormattedNode();
        thisItem.Kind = JsonValueKind.Object;
        thisItem.Complexity = Math.max(...items.map(fn => fn.Complexity)) + 1;
        thisItem.Depth = depth;
        thisItem.Children = items;

        if (thisItem.Depth > this._alwaysExpandDepth) {
            if (this.formatObjectInline(thisItem)) {
                return thisItem;
            }
        }

        if (this.formatTableObjectObject(thisItem))
            return thisItem;

        if (this.formatTableObjectArray(thisItem))
            return thisItem;

        this.formatObjectExpanded(thisItem, false);
        return thisItem;
    }

    private emptyArray(depth: number): FormattedNode {
        const arr = new FormattedNode();
        arr.Value = "[]";
        arr.ValueLength = 2;
        arr.Complexity = 0;
        arr.Depth = depth;
        arr.Kind = JsonValueKind.Array;
        arr.Format = Format.Inline;
        return arr;
    }

    /**
     * Try to format this array in a single line, if possible.
     * @param thisItem
     * @private
     */
    private formatArrayInline(thisItem: FormattedNode): boolean {
        if (thisItem.Complexity > this._maxInlineComplexity)
            return false;

        if (thisItem.Children.some(fn => fn.Format !== Format.Inline))
            return false;

        const useBracketPadding = (thisItem.Complexity >= 2)? this._nestedBracketPadding : this._simpleBracketPadding;
        const lineLength = 2 + (useBracketPadding? 2 : 0)
            + (thisItem.Children.length -1) * this._paddedCommaStr.length
            + thisItem.Children.map(fn => fn.ValueLength).reduce((acc,item) => acc+item);
        if (lineLength > this._maxInlineLength)
            return false;

        const buff : string[] = [];
        buff.push('[');

        if (useBracketPadding)
            buff.push(' ');

        let firstElem = true;
        for (const child of thisItem.Children) {
            if (!firstElem)
                buff.push(this._paddedCommaStr);
            buff.push(child.Value);
            firstElem = false;
        }

        if (useBracketPadding)
            buff.push(' ');
        buff.push(']');

        thisItem.Value = this.combine(buff);
        thisItem.ValueLength = lineLength;
        thisItem.Format = Format.Inline;
        return true;
    }

    /**
     * Try to format this array, spanning multiple lines, but with several items per line, if possible.
     * @param thisItem
     * @private
     */
    private formatArrayMultilineCompact(thisItem: FormattedNode): boolean {
        if (thisItem.Complexity > this._maxCompactArrayComplexity)
            return false;

        if (thisItem.Children.some(fn => fn.Format !== Format.Inline))
            return false;

        const buff : string[] = [];
        buff.push('[', this._eolStr);
        this.indent(buff, thisItem.Depth + 1);

        let lineLengthSoFar = 0;
        let childIndex = 0;
        while (childIndex < thisItem.Children.length) {
            const notLastItem = childIndex < thisItem.Children.length-1;

            const itemLength = thisItem.Children[childIndex].ValueLength;
            const segmentLength = itemLength + ((notLastItem) ? this._paddedCommaStr.length : 0);
            if (lineLengthSoFar + segmentLength > this._maxInlineLength && lineLengthSoFar > 0) {
                buff.push(this._eolStr);
                this.indent(buff, thisItem.Depth+1);
                lineLengthSoFar = 0;
            }

            buff.push(thisItem.Children[childIndex].Value);
            if (notLastItem)
                buff.push(this._paddedCommaStr);

            childIndex += 1;
            lineLengthSoFar += segmentLength;
        }

        buff.push(this._eolStr);
        this.indent(buff, thisItem.Depth);
        buff.push(']');

        thisItem.Value = this.combine(buff);
        thisItem.Format = Format.MultilineCompact;
        return true;
    }

    /**
     * Format this array with one child object per line, and those objects padded to line up nicely.
     * @param thisItem
     * @private
     */
    private formatTableArrayObject(thisItem: FormattedNode): boolean {
        if (this._tableObjectMinimumSimilarity > 100.5)
            return false;

        // Gather stats about our children's property order and width, if they're eligible objects.
        const colStats = this.getPropertyStats(thisItem);
        if (!colStats)
            return false;

        // Reformat our immediate children using the width info we've computed.  Their children aren't
        // recomputed, so this part isn't recursive.
        for (const child of thisItem.Children)
            this.formatObjectTableRow(child, colStats);

        return this.formatArrayExpanded(thisItem);
    }

    /**
     * Format this array with one child array per line, and those arrays padded to line up nicely.
     * @param thisItem
     * @private
     */
    private formatTableArrayArray(thisItem: FormattedNode): boolean {
        if (this._tableArrayMinimumSimilarity > 100.5)
            return false;

        // Gather stats about our children's item widths, if they're eligible arrays.
        const columnStats = this.getArrayStats(thisItem);
        if (!columnStats)
            return false;

        // Reformat our immediate children using the width info we've computed.  Their children aren't
        // recomputed, so this part isn't recursive.
        for (const child of thisItem.Children)
            this.formatArrayTableRow(child, columnStats);

        return this.formatArrayExpanded(thisItem);
    }

    /**
     * Format this array in a single line, with padding to line up with siblings.
     * @param thisItem
     * @param columnStatsArray
     * @private
     */
    private formatArrayTableRow(thisItem: FormattedNode, columnStatsArray: ColumnStats[]) {
        const buff: string[] = [];
        buff.push("[ ");

        // Write the elements that actually exist in this array.
        for (let index=0; index<thisItem.Children.length; ++index) {
            if (index)
                buff.push(this._paddedCommaStr);

            const columnStats = columnStatsArray[index];
            buff.push(columnStats.formatValue(thisItem.Children[index].Value, thisItem.Children[index].ValueLength,
                this._dontJustifyNumbers));
        }

        // Write padding for elements that exist in siblings but not this array.
        for (let index=thisItem.Children.length; index < columnStatsArray.length; ++index) {
            const padSize = columnStatsArray[index].MaxValueSize
                + ((index===0)? 0 : this._paddedCommaStr.length);
            buff.push(' '.repeat(padSize));
        }

        buff.push(" ]");

        thisItem.Value = this.combine(buff);
        thisItem.Format = Format.InlineTabular;
    }

    /**
     * Write this array with each element starting on its own line.  (They might be multiple lines themselves.)
     * @param thisItem
     * @private
     */
    private formatArrayExpanded(thisItem: FormattedNode): boolean {
        const buff : string[] = [];
        buff.push('[', this._eolStr);
        let firstElem = true;
        for (const child of thisItem.Children) {
            if (!firstElem)
                buff.push(',', this._eolStr);
            this.indent(buff, child.Depth).push(child.Value);
            firstElem = false;
        }

        buff.push(this._eolStr);
        this.indent(buff, thisItem.Depth).push(']');

        thisItem.Value = this.combine(buff);
        thisItem.Format = Format.Expanded;
        return true;
    }

    private emptyObject(depth: number) {
        const obj = new FormattedNode();
        obj.Value = "{}";
        obj.ValueLength = 2;
        obj.Complexity = 0;
        obj.Depth = depth;
        obj.Kind = JsonValueKind.Object;
        obj.Format = Format.Inline;
        return obj;
    }

    /**
     * Format this object as a single line, if possible.
     * @param thisItem
     * @private
     */
    private formatObjectInline(thisItem: FormattedNode): boolean {
        if (thisItem.Complexity > this._maxInlineComplexity)
            return false;

        if (thisItem.Children.some(fn => fn.Format !== Format.Inline))
            return false;

        const useBracketPadding = (thisItem.Complexity >= 2)? this._nestedBracketPadding : this._simpleBracketPadding;

        const lineLength = 2 + (useBracketPadding? 2 : 0)
            + thisItem.Children.length * this._paddedColonStr.length
            + (thisItem.Children.length -1) * this._paddedCommaStr.length
            + thisItem.Children.map(fn => fn.NameLength).reduce((acc,item) => acc+item)
            + thisItem.Children.map(fn => fn.ValueLength).reduce((acc,item) => acc+item);
        if (lineLength > this._maxInlineLength)
            return false;

        const buff: string[] = [];
        buff.push('{');

        if (useBracketPadding)
            buff.push(' ');

        let firstElem = true;
        for (const prop of thisItem.Children) {
            if (!firstElem)
                buff.push(this._paddedCommaStr);
            buff.push(prop.Name, this._paddedColonStr, prop.Value);
            firstElem = false;
        }

        if (useBracketPadding)
            buff.push(' ');
        buff.push('}');

        thisItem.Value = this.combine(buff);
        thisItem.ValueLength = lineLength;
        thisItem.Format = Format.Inline;
        return true;
    }

    /**
     * Format this object with one child object per line, and those objects padded to line up nicely.
     * @param thisItem
     * @private
     */
    private formatTableObjectObject(thisItem: FormattedNode): boolean {
        if (this._tableObjectMinimumSimilarity > 100.5)
            return false;

        // Gather stats about our children's property order and width, if they're eligible objects.
        const propStats = this.getPropertyStats(thisItem);
        if (!propStats)
            return false;

        // Reformat our immediate children using the width info we've computed.  Their children aren't
        // recomputed, so this part isn't recursive.
        for (const child of thisItem.Children)
            this.formatObjectTableRow(child, propStats);

        return this.formatObjectExpanded(thisItem, true);
    }

    /**
     * Format this object with one child array per line, and those arrays padded to line up nicely.
     * @param thisItem
     * @private
     */
    private formatTableObjectArray(thisItem: FormattedNode): boolean {
        if (this._tableArrayMinimumSimilarity > 100.5)
            return false;

        // Gather stats about our children's widths, if they're eligible arrays.
        const columnStats = this.getArrayStats(thisItem);
        if (!columnStats)
            return false;

        // Reformat our immediate children using the width info we've computed.  Their children aren't
        // recomputed, so this part isn't recursive.
        for (const child of thisItem.Children)
            this.formatArrayTableRow(child, columnStats);

        return this.formatObjectExpanded(thisItem, true);
    }

    /**
     * Format this object in a single line, with padding to line up with siblings.
     * @param thisItem
     * @param columnStatsArray
     * @private
     */
    private formatObjectTableRow(thisItem: FormattedNode, columnStatsArray: ColumnStats[]) {
        // Bundle up each property name, value, quotes, colons, etc., or equivalent empty space.
        let highestNonBlankIndex: number = -1;
        const propSegmentStrings: string[] = [];
        for (let colIndex=0; colIndex < columnStatsArray.length; ++colIndex) {
            const buff: string[] = [];
            const columnStats = columnStatsArray[colIndex];
            const filteredPropNodes = thisItem.Children.filter(fn => fn.Name === columnStats.PropName);
            if (filteredPropNodes.length===0) {
                // This object doesn't have this particular property.  Pad it out.
                const skipLength = columnStats.PropNameLength
                    + this._paddedColonStr.length
                    + columnStats.MaxValueSize;
                buff.push(' '.repeat(skipLength));
            } else {
                const propNode: FormattedNode = filteredPropNodes[0];
                buff.push(columnStats.PropName, this._paddedColonStr);
                buff.push(columnStats.formatValue(propNode.Value, propNode.ValueLength, this._dontJustifyNumbers));

                highestNonBlankIndex = colIndex;
            }

            propSegmentStrings[colIndex] = this.combine(buff);
        }

        const buff:string[] = [];
        buff.push("{ ");

        // Put them all together with commas in the right places.
        let firstElem = true;
        let needsComma = false;
        for (let segmentIndex=0; segmentIndex<propSegmentStrings.length; ++segmentIndex) {
            if (needsComma && segmentIndex <= highestNonBlankIndex)
                buff.push(this._paddedCommaStr);
            else if (!firstElem)
                buff.push(' '.repeat(this._paddedCommaStr.length));
            buff.push(propSegmentStrings[segmentIndex]);
            needsComma = (propSegmentStrings[segmentIndex].trim().length!==0);
            firstElem = false;
        }

        buff.push(" }");

        thisItem.Value = this.combine(buff);
        thisItem.Format = Format.InlineTabular;
    }

    /**
     * Write this object with each element starting on its own line.  (They might be multiple lines
     * themselves.)
     * @param thisItem
     * @param forceExpandPropNames
     * @private
     */
    private formatObjectExpanded(thisItem: FormattedNode, forceExpandPropNames: boolean): boolean {
        const maxPropNameLength = Math.max(...thisItem.Children.map(fn => fn.NameLength));

        const buff : string[] = [];
        buff.push('{', this._eolStr);

        let firstItem = true;
        for (const prop of thisItem.Children) {
            if (!firstItem)
                buff.push(',', this._eolStr);
            this.indent(buff, prop.Depth).push(prop.Name);

            if (this._alignExpandedPropertyNames || forceExpandPropNames)
                buff.push(' '.repeat(maxPropNameLength - prop.NameLength));

            buff.push(this._paddedColonStr, prop.Value);
            firstItem = false;
        }

        buff.push(this._eolStr);
        this.indent(buff, thisItem.Depth).push('}');

        thisItem.Value = this.combine(buff);
        thisItem.Format = Format.Expanded;
        return true;
    }

    /**
     * If the given nodes are all numbers and not too big or small, format them to the same precision and width.
     * @param itemList
     * @private
     */
    private justifyParallelNumbers(itemList: FormattedNode[]) {
        if (itemList.length < 2 || this._dontJustifyNumbers)
            return;

        const columnStats = new ColumnStats();
        for (const propNode of itemList)
            columnStats.update(propNode, 0);

        if (!columnStats.IsQualifiedNumeric)
            return;

        for (const propNode of itemList) {
            propNode.Value = columnStats.formatValue(propNode.Value, propNode.ValueLength, this._dontJustifyNumbers);
            propNode.ValueLength = columnStats.MaxValueSize;
        }
    }

    /**
     * Check if this node's object children can be formatted as a table, and if so, return stats about
     * their properties, such as max width.  Returns null if they're not eligible.
     * @param thisItem
     * @private
     */
    private getPropertyStats(thisItem: FormattedNode): ColumnStats[] | null {
        if (thisItem.Children.length < 2)
            return null;

        // Record every property across all objects, count them, tabulate their order, and find the longest.
        const props: {[key:string] : ColumnStats} = {};
        for (const child of thisItem.Children) {
            if (child.Kind !== JsonValueKind.Object || child.Format !== Format.Inline)
                return null;

            for (let index=0; index<child.Children.length; ++index) {
                const propNode = child.Children[index];
                let propStats = props[propNode.Name];
                if (!propStats) {
                    propStats = new ColumnStats();
                    propStats.PropName = propNode.Name;
                    propStats.PropNameLength = propNode.NameLength;
                    props[propStats.PropName] = propStats;
                }

                propStats.update(propNode, index);
            }
        }

        // Decide the order of the properties by sorting by the average index.  It's a crude metric,
        // but it should handle the occasional missing property well enough.
        const orderedProps = Object.values(props)
            .sort((a,b) => (a.OrderSum/a.Count) - (b.OrderSum/b.Count));
        const totalPropCount = orderedProps.map(cs => cs.Count).reduce((acc,item) => acc+item);

        // Calculate a score based on how many of all possible properties are present.  If the score is too
        // low, these objects are too different to try to line up as a table.
        const score = 100 * totalPropCount / (orderedProps.length * thisItem.Children.length);
        if (score < this._tableObjectMinimumSimilarity)
            return null;

        // If the formatted lines would be too long, bail out.
        const lineLength = 4                                                                            // outer brackets & spaces
            + orderedProps.map(cs => cs.PropNameLength).reduce((acc,item) => acc+item)  // prop names
            + this._paddedColonStr.length * orderedProps.length                                         // colons
            + orderedProps.map(cs => cs.MaxValueSize).reduce((acc,item) => acc+item)    // values
            + this._paddedCommaStr.length * (orderedProps.length-1);                                    // commas
        if (lineLength > this._maxInlineLength)
            return null;

        return orderedProps;
    }

    /**
     * Check if this node's array children can be formatted as a table, and if so, gather stats like max width.
     * Returns null if they're not eligible.
     * @param thisItem
     * @private
     */
    private getArrayStats(thisItem: FormattedNode): ColumnStats[] | null {
        if (thisItem.Children.length < 2)
            return null;

        const valid = thisItem.Children.every(fn => fn.Kind===JsonValueKind.Array && fn.Format===Format.Inline);
        if (!valid)
            return null;

        const numberOfColumns = Math.max(...thisItem.Children.map(fn => fn.Children.length));
        const colStatsArray: ColumnStats[] = [];
        for (let i=0; i<numberOfColumns; ++i)
            colStatsArray[i] = new ColumnStats();

        for (const rowNode of thisItem.Children) {
            for (let index=0; index<rowNode.Children.length; ++index)
                colStatsArray[index].update(rowNode.Children[index], index);
        }

        // Calculate a score based on how rectangular the arrays are.  If they differ too much in length,
        // it probably doesn't make sense to format them together.
        const totalElemCount = thisItem.Children.map(fn => fn.Children.length).reduce((acc,item) => acc+item);
        const similarity = 100 * totalElemCount / (thisItem.Children.length * numberOfColumns);
        if (similarity < this._tableArrayMinimumSimilarity)
            return null;

        // If the formatted lines would be too long, bail out.
        const lineLength = 4
            + colStatsArray.map(cs => cs.MaxValueSize).reduce((acc,item) => acc+item)
            + (colStatsArray.length -1) * this._paddedCommaStr.length;
        if (lineLength > this._maxInlineLength)
            return null;

        return colStatsArray;
    }
}

export enum EolStyle {
    Crlf,
    lf,
}

enum JsonValueKind {
    Undefined,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Null,
}

/**
 * Used in figuring out how to format properties/array items as columns in a table format.
 */
class ColumnStats {
    PropName: string = "";
    PropNameLength: number = 0;
    OrderSum: number = 0;
    Count: number = 0;
    MaxValueSize: number = 0;
    IsQualifiedNumeric: boolean = true;
    CharsBeforeDec: number = 0;
    CharsAfterDec: number = 0;

    /**
     * Add stats about this FormattedNode to this PropertyStats.
     * @param propNode
     * @param index
     */
    update(propNode: FormattedNode, index: number) {
        this.OrderSum += index;
        this.Count += 1;
        this.MaxValueSize = Math.max(this.MaxValueSize, propNode.ValueLength);
        this.IsQualifiedNumeric = this.IsQualifiedNumeric && (propNode.Kind === JsonValueKind.Number);

        if (!this.IsQualifiedNumeric)
            return;

        const normalizedNum = Number(propNode.Value).toString();
        this.IsQualifiedNumeric = this.IsQualifiedNumeric && !(normalizedNum.includes("e") || normalizedNum.includes("E"));

        if (!this.IsQualifiedNumeric)
            return;

        const decIndex = normalizedNum.indexOf(".");
        if (decIndex < 0) {
            this.CharsBeforeDec = Math.max(this.CharsBeforeDec, normalizedNum.length);
        } else {
            this.CharsBeforeDec = Math.max(this.CharsBeforeDec, decIndex);
            this.CharsAfterDec = Math.max(this.CharsAfterDec, normalizedNum.length - decIndex - 1);
        }
    }

    formatValue(value: string, valueLength: number, dontJustify: boolean): string {
        if (this.IsQualifiedNumeric && !dontJustify) {
            const adjustedVal =  Number(value).toFixed(this.CharsAfterDec);
            const totalLength = this.CharsBeforeDec + this.CharsAfterDec + ((this.CharsAfterDec>0)? 1 : 0);
            return adjustedVal.padStart(totalLength);
        }

        return value.padEnd(this.MaxValueSize - (valueLength-value.length));
    }
}

enum Format {
    Inline,
    InlineTabular,
    MultilineCompact,
    Expanded,
}

/**
 *  Data about a JSON element and how we've formatted it.
 */
class FormattedNode {
    Name: string = "";
    NameLength: number = 0;
    Value: string = "";
    ValueLength: number = 0;
    Complexity: number = 0;
    Depth: number = 0;
    Kind: JsonValueKind = JsonValueKind.Undefined;
    Format: Format = Format.Inline;
    Children: FormattedNode[] = [];

    withName(name: string): FormattedNode {
        this.Name = name;
        return this;
    }

    cleanup() {
        if (this.Format !== Format.Inline)
            this.Children = [];
        for (const child of this.Children)
            child.Children = [];
    }
}
