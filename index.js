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
class FracturedJson {
    constructor() {
        this.MaxInlineLength = 80;
        this.MaxInlineComplexity = 2;
        this.MaxCompactArrayComplexity = 1;
        this.NestedBracketPadding = true;
        this.ColonPadding = true;
        this.CommaPadding = true;
        this.JustifyNumberLists = false;
        this.AlwaysExpandDepth = -1;

        this.IndentString = "    ";
        this.PrefixString = "";

        this._colonPaddingStr = "";
        this._commaPaddingStr = "";
        this._eolStr = "\n";
        this._indentArray = [];
    }

    // Returns the JSON documented formatted as a string, with simpler collections written in single
    // lines where possible.
    Serialize(document) {
        this._setPaddingStrings();
        const root = this._formatElement(0, document);
        return this.PrefixString + root.value;
    }

    // Return a structure containing the element as a formatted string, recursively.  The string doesn't have any
    // leading or trailing whitespace, but if it's an array/object, it might have internal newlines and indentation.
    // The assumption is that whatever contains this element will take care of positioning the start.
    _formatElement(depth, element) {
        if (Array.isArray(element))
            return this._formatArray(depth, element);
        else if (element==null)
            return this._formatSimple(element);
        else if (typeof(element)=="object")
            return this._formatObject(depth, element);
        else
            return this._formatSimple(element);
    }

    _formatArray(depth, array) {
        let maxChildComplexity = 0;

        // Format all array items, and pay attention to how complex they are.
        let items = array
            .map(val => {
                let childElem = this._formatElement(depth+1, val);
                maxChildComplexity = Math.max(maxChildComplexity, childElem.complexity);
                return childElem;
            });

        // Treat an empty array as a primitive: zero complexity.
        if (items.length==0) {
            return {
                value: "[]",
                complexity: 0,
                isNumber: false,
            }
        }

        const justifyLength = (this.JustifyNumberLists && items.every(child => child.isNumber))
            ? Math.max(...items.map(item => item.value.length))
            : 0;
        const alwaysExpandThis = depth <= this.AlwaysExpandDepth;

        // Try formatting this array as a single line, if none of the children are too complex,
        // and the total length isn't excessive.
        let lengthEstimate = items.reduce((acc, newVal) => acc+newVal.value.length+1, 0);
        if (!alwaysExpandThis && maxChildComplexity<this.MaxInlineComplexity && lengthEstimate<=this.MaxInlineLength) {
            var inlineStr = this._formatArrayInline(items, maxChildComplexity, justifyLength);
            if (inlineStr.value.length<=this.MaxInlineLength)
                return inlineStr;
        }

        // We couldn't do a single line.  But if all child elements are simple and we're allowed, write
        // them on a couple lines, multiple items per line.
        if (!alwaysExpandThis && maxChildComplexity<this.MaxCompactArrayComplexity) {
            return this._formatArrayMultiInlineSimple(depth, items, maxChildComplexity, justifyLength);
        }

        // If we've gotten this far, we have to write it as a complex object.  Each child element gets its own
        // line (or more).
        const buff = [];
        buff.push("[", this._eolStr);
        let firstElem = true;
        for (let item of items) {
            if (!firstElem)
                buff.push(",", this._eolStr);
            buff.push(this._indent(depth+1));
            buff.push(item.value.padStart(Math.max(justifyLength, item.value.length)));
            firstElem = false;
        }

        buff.push(this._eolStr);
        buff.push(this._indent(depth));
        buff.push("]");

        return {
            value: this._combine(buff),
            complexity: maxChildComplexity+1,
            isNumber: false,
        };
    }

    _formatArrayInline(itemList, maxChildComplexity, justifyLength) {
        const buff = [];
        buff.push("[");

        if (this.NestedBracketPadding && maxChildComplexity>0)
            buff.push(" ");

        let firstElem = true;
        for (let item of itemList) {
            if (!firstElem)
                buff.push(",", this._commaPaddingStr);
            buff.push(item.value.padStart(Math.max(justifyLength, item.value.length)));
            firstElem = false;
        }

        if (this.NestedBracketPadding && maxChildComplexity>0)
            buff.push(" ");

        buff.push("]");
        return {
            value: this._combine(buff),
            complexity: maxChildComplexity+1,
            isNumber: false,
        };
    }

    _formatArrayMultiInlineSimple(depth, itemList, maxChildComplexity, justifyLength) {
        const buff = [];
        buff.push("[", this._eolStr);
        buff.push(this._indent(depth+1));

        let lineLengthSoFar = 0;
        let itemIndex = 0;
        while (itemIndex<itemList.length) {
            const notLastItem = itemIndex < itemList.length-1;

            const item = itemList[itemIndex];
            const justifiedItemStr = item.value.padStart(Math.max(justifyLength, item.value.length));
            const segmentLength = justifiedItemStr.length
                + ((notLastItem)? 1 + this._commaPaddingStr.length : 0);
            if (lineLengthSoFar + segmentLength > this.MaxInlineLength && lineLengthSoFar > 0) {
                buff.push(this._eolStr);
                buff.push(this._indent(depth+1));
                lineLengthSoFar = 0;
            }

            buff.push(justifiedItemStr);
            if (notLastItem)
                buff.push(",", this._commaPaddingStr);

            itemIndex += 1;
            lineLengthSoFar += segmentLength;
        }

        buff.push(this._eolStr);
        buff.push(this._indent(depth));
        buff.push("]");

        return {
            value: this._combine(buff),
            complexity: maxChildComplexity+1,
            isNumber: false,
        };
    }

    _formatObject(depth, obj) {
        let maxChildComplexity = 0;

        // Format all child property values.
        let keyValPairs = Object.keys(obj)
            .map(key => {
                let formattedProp = this._formatElement(depth+1, obj[key]);
                formattedProp["name"] = String(key);
                maxChildComplexity = Math.max(maxChildComplexity, formattedProp.complexity);
                return formattedProp;
            });

        // Treat an empty array as a primitive: zero complexity.
        if (keyValPairs.length==0) {
            return {
                value: "{}",
                complexity: 0,
                isNumber: false,
            }
        }

        const alwaysExpandThis = depth <= this.AlwaysExpandDepth;

        // Try formatting this object in a single line, if none of the children are too complicated, and
        // the total length isn't too long.
        const lengthEstimate = keyValPairs.reduce((acc, kvp) => kvp.name.length + kvp.value.length + 4, 0);
        if (!alwaysExpandThis && maxChildComplexity<this.MaxInlineComplexity && lengthEstimate<=this.MaxInlineLength) {
            const inlineStr = this._formatObjectInline(keyValPairs, maxChildComplexity);
            if (inlineStr.value.length<=this.MaxInlineLength)
                return inlineStr;
        }

        // If we've gotten this far, we have to write it as a complex object.  Each child property gets its
        // own line, or more.
        const buff = [];
        buff.push("{", this._eolStr);
        let firstItem = true;
        for (let prop of keyValPairs) {
            if (!firstItem)
                buff.push(",", this._eolStr);
            buff.push(this._indent(depth+1));
            buff.push('"', prop.name, '":', this._colonPaddingStr);

            buff.push(prop.value);
            firstItem = false;
        }

        buff.push(this._eolStr);
        buff.push(this._indent(depth));
        buff.push("}");

        return {
            value: this._combine(buff),
            complexity: maxChildComplexity+1,
            isNumber: false,
        };
    }

    _formatObjectInline(propsList, maxChildComplexity) {
        const buff = [];
        buff.push("{");

        if (this.NestedBracketPadding && maxChildComplexity)
            buff.push(" ");

        let firstElem = true;
        for (let prop of propsList) {
            if (!firstElem)
                buff.push(",", this._commaPaddingStr);
            buff.push('"', prop.name, '":', this._colonPaddingStr);

            buff.push(prop.value);
            firstElem = false;
        }

        if (this.NestedBracketPadding && maxChildComplexity>0)
            buff.push(" ");

        buff.push("}");

        return {
            value: this._combine(buff),
            complexity: maxChildComplexity+1,
            isNumber: false,
        };
    }

    _formatSimple(simpleElem) {
        return {
            value: JSON.stringify(simpleElem),
            complexity: 0,
            isNumber: typeof(simpleElem)=="number",
        }
    }

    // Return a string made up of the IndentString repeated several times.
    _indent(depth) {
        let indentStr = this._indentArray[depth];
        if (indentStr==undefined) {
            indentStr = this.PrefixString;
            for (let i=0; i<depth; ++i)
                indentStr += this.IndentString;

            this._indentArray[depth] = indentStr;
        }

        return indentStr;
    }

    _setPaddingStrings() {
        this._colonPaddingStr = (this.ColonPadding)? " " : "";
        this._commaPaddingStr = (this.CommaPadding)? " " : "";
        this._eolStr = "\n";
        this._indentArray = [];
        this.PrefixString = this.PrefixString || "";
    }

    _combine(strArray) {
        return strArray.join('');
    }
}

module.exports = FracturedJson
