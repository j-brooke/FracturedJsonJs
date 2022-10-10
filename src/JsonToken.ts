import {TokenType} from "./TokenType";
import {InputPosition} from "./InputPosition";

/**
 * A piece of JSON text that makes sense to treat as a whole thing when analyzing a document's structure.
 * For example, a string is a token, regardless of whether it represents a value or an object key.
 */
export interface JsonToken {
    Type: TokenType;
    Text: string;
    InputPosition: InputPosition;
}
