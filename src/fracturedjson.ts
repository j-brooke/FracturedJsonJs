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
    get jsonEolStyle(): EolStyle {
        return this._jsonEolStyle;
    }

    set jsonEolStyle(value: EolStyle) {
        this._jsonEolStyle = value;
    }

    get maxInlineLength(): number {
        return this._maxInlineLength;
    }

    set maxInlineLength(value: number) {
        this._maxInlineLength = value;
    }

    get maxInlineComplexity(): number {
        return this._maxInlineComplexity;
    }

    set maxInlineComplexity(value: number) {
        this._maxInlineComplexity = value;
    }

    get maxCompactArrayComplexity(): number {
        return this._maxCompactArrayComplexity;
    }

    set maxCompactArrayComplexity(value: number) {
        this._maxCompactArrayComplexity = value;
    }

    get nestedBracketPadding(): boolean {
        return this._nestedBracketPadding;
    }

    set nestedBracketPadding(value: boolean) {
        this._nestedBracketPadding = value;
    }

    get colonPadding(): boolean {
        return this._colonPadding;
    }

    set colonPadding(value: boolean) {
        this._colonPadding = value;
    }

    get commaPadding(): boolean {
        return this._commaPadding;
    }

    set commaPadding(value: boolean) {
        this._commaPadding = value;
    }

    get alwaysExpandDepth(): number {
        return this._alwaysExpandDepth;
    }

    set alwaysExpandDepth(value: number) {
        this._alwaysExpandDepth = value;
    }

    get indentSpaces(): number {
        return this._indentSpaces;
    }

    set indentSpaces(value: number) {
        this._indentSpaces = value;
    }

    get useTabToIndent(): boolean {
        return this._useTabToIndent;
    }

    set useTabToIndent(value: boolean) {
        this._useTabToIndent = value;
    }

    get tableObjectMinimumSimilarity(): number {
        return this._tableObjectMinimumSimilarity;
    }

    set tableObjectMinimumSimilarity(value: number) {
        this._tableObjectMinimumSimilarity = value;
    }

    get tableArrayMinimumSimilarity(): number {
        return this._tableArrayMinimumSimilarity;
    }

    set tableArrayMinimumSimilarity(value: number) {
        this._tableArrayMinimumSimilarity = value;
    }

    get alignExpandedPropertyNames(): boolean {
        return this._alignExpandedPropertyNames;
    }

    set alignExpandedPropertyNames(value: boolean) {
        this._alignExpandedPropertyNames = value;
    }

    get dontJustifyNumbers(): boolean {
        return this._dontJustifyNumbers;
    }

    set dontJustifyNumbers(value: boolean) {
        this._dontJustifyNumbers = value;
    }

    get prefixString(): string {
        return this._prefixString;
    }

    set prefixString(value: string) {
        this._prefixString = value;
    }

    serialize(jsValue: any): string {
        this.initInternals();
        return this._prefixString + this.formatElement(0, jsValue).Value;
    }

    private _jsonEolStyle: EolStyle = EolStyle.lf;
    private _maxInlineLength: number = 80;
    private _maxInlineComplexity: number = 2;
    private _maxCompactArrayComplexity: number = 1;
    private _nestedBracketPadding: boolean = true;
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

    private _eolStr: string = "";
    private _indentStr: string = "";
    private _paddedCommaStr: string = "";
    private _paddedColonStr: string = "";
    private _indentCache: string[] = [];

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

    private formatSimple(depth: number, element: any): FormattedNode {
        const simpleNode = new FormattedNode();
        simpleNode.Value = JSON.stringify(element);
        simpleNode.Complexity = 0;
        simpleNode.Depth = depth;
        simpleNode.Kind = JsonValueKind.Array;
        simpleNode.Format = Format.Inline;

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
        const items = Object.entries(element)
            .map(kvp => this.formatElement(depth+1, kvp[1]).withName(kvp[0]));
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
        arr.Complexity = 0;
        arr.Depth = depth;
        arr.Kind = JsonValueKind.Array;
        arr.Format = Format.Inline;
        return arr;
    }

    private formatArrayInline(thisItem: FormattedNode): boolean {
        if (thisItem.Complexity > this._maxInlineComplexity)
            return false;

        const useNestedBracketPadding = (this._nestedBracketPadding && thisItem.Complexity >= 2);
        const lineLength = 2 + (useNestedBracketPadding? 2 : 0)
            + (thisItem.Children.length -1) * this._paddedCommaStr.length
            + thisItem.Children.map(fn => fn.Value.length).reduce((acc,item) => acc+item);
        if (lineLength > this._maxInlineLength)
            return false;

        const buff : string[] = [];
        buff.push('[');

        if (useNestedBracketPadding)
            buff.push(' ');

        let firstElem = true;
        for (const child of thisItem.Children) {
            if (!firstElem)
                buff.push(this._paddedCommaStr);
            buff.push(child.Value);
            firstElem = false;
        }

        if (useNestedBracketPadding)
            buff.push(' ');
        buff.push(']');

        thisItem.Value = this.combine(buff);
        thisItem.Format = Format.Inline;
        return true;
    }

    private formatArrayMultilineCompact(thisItem: FormattedNode): boolean {
        if (thisItem.Complexity > this._maxCompactArrayComplexity)
            return false;

        const buff : string[] = [];
        buff.push('[', this._eolStr);
        this.indent(buff, thisItem.Depth + 1);

        let lineLengthSoFar = 0;
        let childIndex = 0;
        while (childIndex < thisItem.Children.length) {
            const notLastItem = childIndex < thisItem.Children.length-1;

            const itemLength = thisItem.Children[childIndex].Value.length;
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

    private formatTableArrayObject(thisItem: FormattedNode): boolean {
        if (this._tableObjectMinimumSimilarity > 100.5)
            return false;

        const colStats = this.getPropertyStats(thisItem);
        if (!colStats)
            return false;

        for (const child of thisItem.Children)
            this.formatObjectTableRow(child, colStats);

        return this.formatArrayExpanded(thisItem);
    }

    private formatTableArrayArray(thisItem: FormattedNode): boolean {
        if (this._tableArrayMinimumSimilarity > 100.5)
            return false;

        const columnStats = this.getArrayStats(thisItem);
        if (!columnStats)
            return false;

        for (const child of thisItem.Children)
            this.formatArrayTableRow(child, columnStats);

        return this.formatArrayExpanded(thisItem);
    }

    private formatArrayTableRow(thisItem: FormattedNode, columnStatsArray: ColumnStats[]) {
        const buff: string[] = [];
        buff.push("[ ");

        for (let index=0; index<thisItem.Children.length; ++index) {
            if (index)
                buff.push(this._paddedCommaStr);

            const columnStats = columnStatsArray[index];
            buff.push(columnStats.formatValue(thisItem.Children[index].Value, this._dontJustifyNumbers));
        }

        for (let index=thisItem.Children.length; index < columnStatsArray.length; ++index) {
            const padSize = columnStatsArray[index].MaxValueSize
                + ((index===0)? 0 : this._paddedCommaStr.length);
            buff.push(' '.repeat(padSize));
        }

        buff.push(" ]");

        thisItem.Value = this.combine(buff);
        thisItem.Format = Format.InlineTabular;
    }

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
        obj.Complexity = 0;
        obj.Depth = depth;
        obj.Kind = JsonValueKind.Object;
        obj.Format = Format.Inline;
        return obj;
    }

    private formatObjectInline(thisItem: FormattedNode): boolean {
        if (thisItem.Complexity > this._maxInlineComplexity)
            return false;

        const useNestedBracketPadding = (this._nestedBracketPadding && thisItem.Complexity >= 2);

        const lineLength = 2 + (useNestedBracketPadding? 2 : 0)
            + thisItem.Children.length * this._paddedColonStr.length
            + (thisItem.Children.length -1) * this._paddedCommaStr.length
            + thisItem.Children.length * 2
            + thisItem.Children.map(fn => fn.Name.length).reduce((acc,item) => acc+item)
            + thisItem.Children.map(fn => fn.Value.length).reduce((acc,item) => acc+item);
        if (lineLength > this._maxInlineLength)
            return false;

        const buff: string[] = [];
        buff.push('{');

        if (useNestedBracketPadding)
            buff.push(' ');

        let firstElem = true;
        for (const prop of thisItem.Children) {
            if (!firstElem)
                buff.push(this._paddedCommaStr);
            buff.push('"', prop.Name, '"', this._paddedColonStr, prop.Value);
            firstElem = false;
        }

        if (useNestedBracketPadding)
            buff.push(' ');
        buff.push('}');

        thisItem.Value = this.combine(buff);
        thisItem.Format = Format.Inline;
        return true;
    }

    private formatTableObjectObject(thisItem: FormattedNode): boolean {
        if (this._tableObjectMinimumSimilarity > 100.5)
            return false;

        const propStats = this.getPropertyStats(thisItem);
        if (!propStats)
            return false;

        for (const child of thisItem.Children)
            this.formatObjectTableRow(child, propStats);

        return this.formatObjectExpanded(thisItem, true);
    }

    private formatTableObjectArray(thisItem: FormattedNode): boolean {
        if (this._tableArrayMinimumSimilarity > 100.5)
            return false;

        const columnStats = this.getArrayStats(thisItem);
        if (!columnStats)
            return false;

        for (const child of thisItem.Children)
            this.formatArrayTableRow(child, columnStats);

        return this.formatObjectExpanded(thisItem, true);
    }

    private formatObjectTableRow(thisItem: FormattedNode, columnStatsArray: ColumnStats[]) {
        let highestNonBlankIndex: number = -1;
        const propSegmentStrings: string[] = [];
        for (let colIndex=0; colIndex < columnStatsArray.length; ++colIndex) {
            const buff: string[] = [];
            const columnStats = columnStatsArray[colIndex];
            const filteredPropNodes = thisItem.Children.filter(fn => fn.Name === columnStats.PropName);
            if (filteredPropNodes.length===0) {
                const skipLength = 2
                    + columnStats.PropName.length
                    + this._paddedColonStr.length
                    + columnStats.MaxValueSize;
                buff.push(' '.repeat(skipLength));
            } else {
                const propNode: FormattedNode = filteredPropNodes[0];
                buff.push('"', columnStats.PropName, '"', this._paddedColonStr);
                buff.push(columnStats.formatValue(propNode.Value, this._dontJustifyNumbers));

                highestNonBlankIndex = colIndex;
            }

            propSegmentStrings[colIndex] = this.combine(buff);
        }

        const buff:string[] = [];
        buff.push("{ ");

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

    private formatObjectExpanded(thisItem: FormattedNode, forceExpandPropNames: boolean): boolean {
        const maxPropNameLength = Math.max(...thisItem.Children.map(fn => fn.Name.length));

        const buff : string[] = [];
        buff.push('{', this._eolStr);

        let firstItem = true;
        for (const prop of thisItem.Children) {
            if (!firstItem)
                buff.push(',', this._eolStr);
            this.indent(buff, prop.Depth).push('"', prop.Name, '"');

            if (this._alignExpandedPropertyNames || forceExpandPropNames)
                buff.push(' '.repeat(maxPropNameLength - prop.Name.length));

            buff.push(this._paddedColonStr, prop.Value);
            firstItem = false;
        }

        buff.push(this._eolStr);
        this.indent(buff, thisItem.Depth).push('}');

        thisItem.Value = this.combine(buff);
        thisItem.Format = Format.Expanded;
        return true;
    }

    private justifyParallelNumbers(itemList: FormattedNode[]) {
        if (itemList.length < 2 || this._dontJustifyNumbers)
            return;

        const columnStats = new ColumnStats();
        for (const propNode of itemList)
            columnStats.update(propNode, 0);

        if (!columnStats.IsQualifiedNumeric)
            return;

        for (const propNode of itemList)
            propNode.Value = columnStats.formatValue(propNode.Value, this._dontJustifyNumbers);
    }

    private getPropertyStats(thisItem: FormattedNode): ColumnStats[] | null {
        if (thisItem.Children.length < 2)
            return null;

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
                    props[propStats.PropName] = propStats;
                }

                propStats.update(propNode, index);
            }
        }

        const orderedProps = Object.values(props)
            .sort((a,b) => (a.OrderSum/a.Count) - (b.OrderSum/b.Count));
        const totalPropCount = orderedProps.map(cs => cs.Count).reduce((acc,item) => acc+item);
        const score = 100 * totalPropCount / (orderedProps.length * thisItem.Children.length);
        if (score < this._tableObjectMinimumSimilarity)
            return null;

        const lineLength = 4
            + 2 * orderedProps.length
            + orderedProps.map(cs => cs.PropName.length).reduce((acc,item) => acc+item)
            + this._paddedColonStr.length * orderedProps.length
            + orderedProps.map(cs => cs.MaxValueSize).reduce((acc,item) => acc+item)
            + this._paddedCommaStr.length * (orderedProps.length-1);
        if (lineLength > this._maxInlineLength)
            return null;

        return orderedProps;
    }

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

        const totalElemCount = thisItem.Children.map(fn => fn.Children.length).reduce((acc,item) => acc+item);
        const similarity = 100 * totalElemCount / (thisItem.Children.length * numberOfColumns);
        if (similarity < this._tableArrayMinimumSimilarity)
            return null;

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

class ColumnStats {
    PropName: string = "";
    OrderSum: number = 0;
    Count: number = 0;
    MaxValueSize: number = 0;
    IsQualifiedNumeric: boolean = true;
    CharsBeforeDec: number = 0;
    CharsAfterDec: number = 0;

    update(propNode: FormattedNode, index: number) {
        this.OrderSum += index;
        this.Count += 1;
        this.MaxValueSize = Math.max(this.MaxValueSize, propNode.Value.length);
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

    formatValue(value: string, dontJustify: boolean): string {
        if (this.IsQualifiedNumeric && !dontJustify) {
            const adjustedVal =  Number(value).toFixed(this.CharsAfterDec);
            const totalLength = this.CharsBeforeDec + this.CharsAfterDec + ((this.CharsAfterDec>0)? 1 : 0);
            return adjustedVal.padStart(totalLength);
        }

        return value.padEnd(this.MaxValueSize);
    }
}

enum Format {
    Inline,
    InlineTabular,
    MultilineCompact,
    Expanded,
}

class FormattedNode {
    Name: string = "";
    Value: string = "";
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
