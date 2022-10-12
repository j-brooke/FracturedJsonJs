import {JsonItemType} from "./JsonItemType";
import {InputPosition} from "./InputPosition";

/**
 * A distinct thing that can be where ever JSON values are expected in a JSON-with-comments doc.  This could be an
 * actual data value, such as a string, number, array, etc. (generally referred to here as "elements"), or it could be
 * a blank line or standalone comment.  In some cases, comments won't be stand-alone JsonItems, but will instead
 * be attached to elements to which they seem to belong.
 *
 * Much of this data is produced by the Parser, but some of the properties - like all of the
 * length ones - are not set by Parser, but rather, provided for use by Formatter.
 */
export class JsonItem {
    Type: JsonItemType = JsonItemType.Null;

    /**
     * Line number from the input - if available - where this element began.
     */
    InputPosition: InputPosition = {Index:0, Row:0, Column:0};

    /**
     * Nesting level of this item's contents if any.  A simple item, or an empty array or object, has a complexity of
     * zero.  Non-empty arrays/objects have a complexity 1 greater than that of their child with the greatest
     * complexity.
     */
    Complexity:number = 0;

    /**
     * Property name, if this is an element (real JSON value) that is contained in an object.
     */
    Name:string = "";

    /**
     * The text value of this item, non-recursively.  Null for objects and arrays.
     */
    Value:string = "";

    /**
     * Comment that belongs in front of this element on the same line, if any.
     */
    PrefixComment:string = "";

    /**
     * Comment (or, possibly many of them) that belongs in between the property name and value, if any.
     */
    MiddleComment:string = "";

    /**
     * Comment that belongs in front of this element on the same line, if any.
     */
    PostfixComment:string = "";

    /**
     * True if the postfix comment is to-end-of-line rather than block style.
     */
    IsPostCommentLineStyle: boolean = false;

    NameLength:number = 0;
    ValueLength:number = 0;
    PrefixCommentLength:number = 0;
    MiddleCommentLength:number = 0;
    PostfixCommentLength:number = 0;

    /**
     * The smallest possible size this item - including all comments and children if appropriate - can be written.
     */
    MinimumTotalLength:number = 0;

    /**
     * True if this item can't be written on a single line.
     * For example, an item ending in a postfix line comment
     * (like // ) can often be written on a single line, because the comment is the last thing.  But if it's a
     * container with such an item inside it, it's impossible to inline the container, because there's no way to
     * write the line comment and then a closing bracket.
     */
    RequiresMultipleLines:boolean = false;

    /**
     * List of this item's contents, if it's an array or object.
     */
    Children:JsonItem[] = [];
}
