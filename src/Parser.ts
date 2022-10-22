import {FracturedJsonOptions} from "./FracturedJsonOptions";
import {TokenEnumerator} from "./TokenEnumerator";
import {JsonItem} from "./JsonItem";
import {JsonToken} from "./JsonToken";
import {JsonItemType} from "./JsonItemType";
import {TokenType} from "./TokenType";
import {FracturedJsonError} from "./FracturedJsonError";
import {InputPosition} from "./InputPosition";
import {CommentPolicy} from "./CommentPolicy";
import {TokenGenerator} from "./TokenGenerator";


export class Parser {
    Options:FracturedJsonOptions = new FracturedJsonOptions();

    public ParseTopLevel(inputJson: string, stopAfterFirstElem: boolean): JsonItem[] {
        const tokenStream = new TokenEnumerator(TokenGenerator(inputJson));
        return this.ParseTopLevelFromEnum(tokenStream, stopAfterFirstElem);
    }

    private ParseTopLevelFromEnum(enumerator: TokenEnumerator, stopAfterFirstElem: boolean): JsonItem[] {
        const topLevelItems: JsonItem[] = [];

        let topLevelElemSeen = false;
        while (true) {
            if (!enumerator.MoveNext())
                return topLevelItems;

            const item = this.ParseItem(enumerator);
            const isComment = item.Type == JsonItemType.BlockComment || item.Type == JsonItemType.LineComment;
            const isBlank = item.Type == JsonItemType.BlankLine;

            if (isBlank) {
                if (this.Options.PreserveBlankLines)
                    topLevelItems.push(item);
            }
            else if (isComment) {
                if (this.Options.CommentPolicy == CommentPolicy.TreatAsError)
                    throw new FracturedJsonError("Comments not allowed with current options",
                        item.InputPosition);
                if (this.Options.CommentPolicy == CommentPolicy.Preserve)
                    topLevelItems.push(item);
            }
            else {
                if (stopAfterFirstElem && topLevelElemSeen)
                    throw new FracturedJsonError("Unexpected start of second top level element",
                        item.InputPosition);
                topLevelItems.push(item);
                topLevelElemSeen = true;
            }
        }
    }

    private ParseItem(enumerator: TokenEnumerator): JsonItem {
        switch (enumerator.Current.Type) {
            case TokenType.BeginArray:
                return this.ParseArray(enumerator);
            case TokenType.BeginObject:
                return this.ParseObject(enumerator);
            default:
                return this.ParseSimple(enumerator.Current);
        }
    }

    private ParseSimple(token: JsonToken): JsonItem {
        const item = new JsonItem();
        item.Type = Parser.ItemTypeFromTokenType(token);
        item.Value = token.Text;
        item.InputPosition = token.InputPosition;
        item.Complexity = 0;

        return item;
    }

    /**
     * Parse the stream of tokens into a JSON array (recursively).  The enumerator should be pointing to the open
     * square bracket token at the start of the call.  It will be pointing to the closing bracket when the call
     * returns.
     */
    private ParseArray(enumerator: TokenEnumerator): JsonItem {
        if (enumerator.Current.Type != TokenType.BeginArray)
            throw new FracturedJsonError("Parser logic error", enumerator.Current.InputPosition);

        const startingInputPosition = enumerator.Current.InputPosition;

        // Holder for an element that was already added to the child list that is eligible for a postfix comment.
        let elemNeedingPostComment: JsonItem | undefined = undefined;
        let elemNeedingPostEndRow = -1;

        // A single-line block comment that HAS NOT been added to the child list, that might serve as a prefix comment.
        let unplacedComment: JsonItem | undefined = undefined;

        const childList: JsonItem[] = [];
        let commaStatus = CommaStatus.EmptyCollection;
        let endOfArrayFound = false;
        let thisArrayComplexity = 0;
        while (!endOfArrayFound) {
            // Get the next token, or throw an error if the input ends.
            const token = Parser.GetNextTokenOrThrow(enumerator, startingInputPosition);

            // If the token we're about to deal with isn't on the same line as an unplaced comment or is the end of the
            // array, this is our last chance to find a place for that comment.
            const unplacedCommentNeedsHome = unplacedComment
                && (unplacedComment?.InputPosition.Row != token.InputPosition.Row || token.Type==TokenType.EndArray);
            if (unplacedCommentNeedsHome) {
                if (elemNeedingPostComment) {
                    // So there's a comment we don't have a place for yet, and a previous element that doesn't have
                    // a postfix comment.  And since the new token is on a new line (or end of array), the comment
                    // doesn't belong to whatever is coming up next.  So attach the unplaced comment to the old
                    // element.  (This is probably a comment at the end of a line after a comma.)
                    elemNeedingPostComment.PostfixComment = unplacedComment!.Value;
                    elemNeedingPostComment.IsPostCommentLineStyle = (unplacedComment!.Type == JsonItemType.LineComment);
                }
                else {
                    // There's no old element to attach it to, so just add the comment as a standalone child.
                    childList.push(unplacedComment!);
                }

                unplacedComment = undefined;
            }

            // If the token we're about to deal with isn't on the same line as the last element, the new token obviously
            // won't be a postfix comment.
            if (elemNeedingPostComment && elemNeedingPostEndRow != token.InputPosition.Row)
                elemNeedingPostComment = undefined;

            switch (token.Type) {
                case TokenType.EndArray:
                    if (commaStatus == CommaStatus.CommaSeen && !this.Options.AllowTrailingCommas)
                        throw new FracturedJsonError("Array may not end with a comma with current options",
                            token.InputPosition);
                    endOfArrayFound = true;
                    break;

                case TokenType.Comma:
                    if (commaStatus != CommaStatus.ElementSeen)
                        throw new FracturedJsonError("Unexpected comma in array", token.InputPosition);
                    commaStatus = CommaStatus.CommaSeen;
                    break;

                case TokenType.BlankLine:
                    if (!this.Options.PreserveBlankLines)
                        break;
                    childList.push(this.ParseSimple(token));
                    break;

                case TokenType.BlockComment:
                    if (this.Options.CommentPolicy == CommentPolicy.Remove)
                        break;
                    if (this.Options.CommentPolicy == CommentPolicy.TreatAsError)
                        throw new FracturedJsonError("Comments not allowed with current options",
                            token.InputPosition);

                    if (unplacedComment) {
                        // There was a block comment before this one.  Add it as a standalone comment to make room.
                        childList.push(unplacedComment);
                        unplacedComment = undefined;
                    }

                    // If this is a multiline comment, add it as standalone.
                    const commentItem = this.ParseSimple(token);
                    if (Parser.IsMultilineComment(commentItem)) {
                        childList.push(commentItem);
                        break;
                    }

                    // If this comment came after an element and before a comma, attach it to that element.
                    if (elemNeedingPostComment && commaStatus == CommaStatus.ElementSeen) {
                        elemNeedingPostComment.PostfixComment = commentItem.Value;
                        elemNeedingPostComment.IsPostCommentLineStyle = false;
                        elemNeedingPostComment = undefined;
                        break;
                    }

                    // Hold on to it for now.  Even if elemNeedingPostComment != null, it's possible that this comment
                    // should be attached to the next element, not that one.  (For instance, two elements on the same
                    // line, with a comment between them.)
                    unplacedComment = commentItem;
                    break;

                case TokenType.LineComment:
                    if (this.Options.CommentPolicy == CommentPolicy.Remove)
                        break;
                    if (this.Options.CommentPolicy == CommentPolicy.TreatAsError)
                        throw new FracturedJsonError("Comments not allowed with current options",
                            token.InputPosition);

                    if (unplacedComment) {
                        // A previous comment followed by a line-ending comment?  Add them both as standalone comments
                        childList.push(unplacedComment);
                        childList.push(this.ParseSimple(token));
                        unplacedComment = undefined;
                        break;
                    }

                    if (elemNeedingPostComment) {
                        // Since this is a line comment, we know there isn't anything else on the line after this.
                        // So if there was an element before this that can take a comment, attach it.
                        elemNeedingPostComment.PostfixComment = token.Text;
                        elemNeedingPostComment.IsPostCommentLineStyle = true;
                        elemNeedingPostComment = undefined;
                        break;
                    }

                    childList.push(this.ParseSimple(token));
                    break;

                case TokenType.False:
                case TokenType.True:
                case TokenType.Null:
                case TokenType.String:
                case TokenType.Number:
                case TokenType.BeginArray:
                case TokenType.BeginObject:
                    if (commaStatus == CommaStatus.ElementSeen)
                        throw new FracturedJsonError("Comma missing while processing array", token.InputPosition);

                    const element = this.ParseItem(enumerator);
                    commaStatus = CommaStatus.ElementSeen
                    thisArrayComplexity = Math.max(thisArrayComplexity, element.Complexity+1);

                    if (unplacedComment) {
                        element.PrefixComment = unplacedComment.Value;
                        unplacedComment = undefined;
                    }

                    childList.push(element);

                    // Remember this element and the row it ended on (not token.InputPosition.Row).
                    elemNeedingPostComment = element;
                    elemNeedingPostEndRow = enumerator.Current.InputPosition.Row;
                    break;

                default:
                    throw new FracturedJsonError("Unexpected token in array", token.InputPosition);
            }
        }

        const arrayItem = new JsonItem();
        arrayItem.Type = JsonItemType.Array;
        arrayItem.InputPosition = startingInputPosition;
        arrayItem.Complexity = thisArrayComplexity;
        arrayItem.Children = childList;

        return arrayItem;
    }

    /**
     * Parse the stream of tokens into a JSON object (recursively).  The enumerator should be pointing to the open
     * curly bracket token at the start of the call.  It will be pointing to the closing bracket when the call
     * returns.
     */
    private ParseObject(enumerator: TokenEnumerator): JsonItem {
        if (enumerator.Current.Type != TokenType.BeginObject)
            throw new FracturedJsonError("Parser logic error", enumerator.Current.InputPosition);

        const startingInputPosition = enumerator.Current.InputPosition;
        const childList: JsonItem[] = [];

        let propertyName: JsonToken | undefined = undefined;
        let propertyValue: JsonItem | undefined = undefined;
        let linePropValueEnds = -1;
        let beforePropComments: JsonItem[] = [];
        let midPropComments: JsonToken[] = [];
        let afterPropComment: JsonItem | undefined = undefined;
        let afterPropCommentWasAfterComma = false;

        let phase = ObjectPhase.BeforePropName;
        let thisObjComplexity = 0;
        let endOfObject = false;
        while (!endOfObject) {
            const token = Parser.GetNextTokenOrThrow(enumerator, startingInputPosition);

            // We may have collected a bunch of stuff that should be combined into a single JsonItem.  If we have a
            // property name and value, then we're just waiting for potential postfix comments.  But it might be time
            // to bundle it all up and add it to childList before going on.
            const isNewLine = (linePropValueEnds != token.InputPosition.Row);
            const isEndOfObject = (token.Type == TokenType.EndObject);
            const startingNextPropName = (token.Type == TokenType.String && phase == ObjectPhase.AfterComma);
            const isExcessPostComment = afterPropComment
                && (token.Type==TokenType.BlockComment || token.Type==TokenType.LineComment);
            const needToFlush = propertyName && propertyValue
                && (isNewLine || isEndOfObject || startingNextPropName || isExcessPostComment);
            if (needToFlush) {
                let commentToHoldForNextElem:JsonItem | undefined;
                if (startingNextPropName && afterPropCommentWasAfterComma && !isNewLine) {
                    // We've got an afterPropComment that showed up after the comma, and we're about to process
                    // another element on this same line.  The comment should go with the next one, to honor the
                    // comma placement.
                    commentToHoldForNextElem = afterPropComment;
                    afterPropComment = undefined;
                }

                Parser.AttachObjectValuePieces(childList, propertyName!, propertyValue!, linePropValueEnds,
                    beforePropComments, midPropComments, afterPropComment);
                thisObjComplexity = Math.max(thisObjComplexity, propertyValue!.Complexity + 1);
                propertyName = undefined;
                propertyValue = undefined;
                beforePropComments = [];
                midPropComments = [];
                afterPropComment = undefined;

                if (commentToHoldForNextElem)
                    beforePropComments.push(commentToHoldForNextElem);
            }

            switch (token.Type) {
                case TokenType.BlankLine:
                    if (!this.Options.PreserveBlankLines)
                        break;
                    if (phase == ObjectPhase.AfterPropName || phase == ObjectPhase.AfterColon)
                        break;

                    // If we were hanging on to comments to maybe be prefix comments, add them as standalone before
                    // adding a blank line item.
                    childList.push(...beforePropComments);
                    beforePropComments = [];
                    childList.push(this.ParseSimple(token));
                    break;
                case TokenType.BlockComment:
                case TokenType.LineComment:
                    if (this.Options.CommentPolicy == CommentPolicy.Remove)
                        break;
                    if (this.Options.CommentPolicy == CommentPolicy.TreatAsError)
                        throw new FracturedJsonError("Comments not allowed with current options",
                            token.InputPosition);
                    if (phase == ObjectPhase.BeforePropName || !propertyName) {
                        beforePropComments.push(this.ParseSimple(token));
                    }
                    else if (phase == ObjectPhase.AfterPropName || phase == ObjectPhase.AfterColon) {
                        midPropComments.push(token);
                    }
                    else {
                        afterPropComment = this.ParseSimple(token);
                        afterPropCommentWasAfterComma = (phase == ObjectPhase.AfterComma);
                    }
                    break;
                case TokenType.EndObject:
                    endOfObject = true;
                    break;
                case TokenType.String:
                    if (phase == ObjectPhase.BeforePropName || phase == ObjectPhase.AfterComma) {
                        propertyName = token;
                        phase = ObjectPhase.AfterPropName;
                    }
                    else if (phase == ObjectPhase.AfterColon) {
                        propertyValue = this.ParseItem(enumerator);
                        linePropValueEnds = enumerator.Current.InputPosition.Row;
                        phase = ObjectPhase.AfterPropValue;
                    }
                    else {
                        throw new FracturedJsonError("Unexpected string found while processing object",
                            token.InputPosition);
                    }
                    break;
                case TokenType.False:
                case TokenType.True:
                case TokenType.Null:
                case TokenType.Number:
                case TokenType.BeginArray:
                case TokenType.BeginObject:
                    if (phase != ObjectPhase.AfterColon)
                        throw new FracturedJsonError("Unexpected element while processing object",
                            token.InputPosition);
                    propertyValue = this.ParseItem(enumerator);
                    linePropValueEnds = enumerator.Current.InputPosition.Row;
                    phase = ObjectPhase.AfterPropValue;
                    break;
                case TokenType.Colon:
                    if (phase != ObjectPhase.AfterPropName)
                        throw new FracturedJsonError("Unexpected colon while processing object",
                            token.InputPosition);
                    phase = ObjectPhase.AfterColon;
                    break;
                case TokenType.Comma:
                    if (phase != ObjectPhase.AfterPropValue)
                        throw new FracturedJsonError("Unexpected comma while processing object",
                            token.InputPosition);
                    phase = ObjectPhase.AfterComma;
                    break;
                default:
                    throw new FracturedJsonError("Unexpected token while processing object",
                        token.InputPosition);
            }
        }

        if (!this.Options.AllowTrailingCommas && phase == ObjectPhase.AfterComma)
            throw new FracturedJsonError("Object may not end with comma with current options",
                enumerator.Current.InputPosition);

        const objItem = new JsonItem();
        objItem.Type = JsonItemType.Object;
        objItem.InputPosition = startingInputPosition;
        objItem.Complexity = thisObjComplexity;
        objItem.Children = childList;

        return objItem;
    }




    private static ItemTypeFromTokenType(token: JsonToken): JsonItemType {
        switch (token.Type) {
            case TokenType.False: return JsonItemType.False;
            case TokenType.True: return JsonItemType.True;
            case TokenType.Null: return JsonItemType.Null;
            case TokenType.Number: return JsonItemType.Number;
            case TokenType.String: return JsonItemType.String;
            case TokenType.BlankLine: return JsonItemType.BlankLine;
            case TokenType.BlockComment: return JsonItemType.BlockComment;
            case TokenType.LineComment: return JsonItemType.LineComment;
            default: throw new FracturedJsonError("Unexpected Token", token.InputPosition);
        }
    }

    private static GetNextTokenOrThrow(enumerator:TokenEnumerator, startPosition:InputPosition) {
        if (!enumerator.MoveNext())
            throw new FracturedJsonError("Unexpected end of input while processing array or object starting",
                startPosition);
        return enumerator.Current;
    }

    private static IsMultilineComment(item: JsonItem): boolean {
        return item.Type==JsonItemType.BlockComment && item.Value.includes("\n");
    }

    private static AttachObjectValuePieces(objItemList: JsonItem[], name: JsonToken, element: JsonItem,
        valueEndingLine: number, beforeComments: JsonItem[], midComments: JsonToken[], afterComment?: JsonItem) {
        element.Name = name.Text;

        // Deal with any comments between the property name and its element.  If there's more than one, squish them
        // together.  If it's a line comment, make sure it ends in a \n (which isn't how it's handled elsewhere, alas.)
        if (midComments.length > 0) {
            let combined = "";
            for (let i=0; i<midComments.length; ++i) {
                combined += midComments[i].Text;
                if (i < midComments.length-1 || midComments[i].Type==TokenType.LineComment)
                    combined += "\n";
            }

            element.MiddleComment = combined;
        }

        // Figure out if the last of the comments before the prop name should be attached to this element.
        // Any others should be added as unattached comment items.
        if (beforeComments.length > 0) {
            const lastOfBefore = beforeComments.pop();
            if (lastOfBefore!.Type == JsonItemType.BlockComment
                && lastOfBefore!.InputPosition.Row == element.InputPosition.Row) {
                element.PrefixComment = lastOfBefore!.Value;
                objItemList.push(...beforeComments);
            }
            else {
                objItemList.push(...beforeComments);
                objItemList.push(lastOfBefore!);
            }
        }

        objItemList.push(element);

        // Figure out if the first of the comments after the element should be attached to the element, and add
        // the others as unattached comment items.
        if (afterComment) {
            if (!this.IsMultilineComment(afterComment) && afterComment.InputPosition.Row == valueEndingLine) {
                element.PostfixComment = afterComment.Value;
                element.IsPostCommentLineStyle = (afterComment.Type == JsonItemType.LineComment);
            }
            else {
                objItemList.push(afterComment);
            }
        }
    }
}

enum CommaStatus
{
    EmptyCollection,
    ElementSeen,
    CommaSeen,
}

enum ObjectPhase
{
    BeforePropName,
    AfterPropName,
    AfterColon,
    AfterPropValue,
    AfterComma,
}