import {InputPosition} from "./InputPosition";
import {TokenType} from "./TokenType";
import {JsonToken} from "./JsonToken";
import {FracturedJsonError} from "./FracturedJsonError";

/**
 * Class for keeping track of info while scanning text into JSON tokens.
 */
export class ScannerState {
    CurrentPosition: InputPosition = { Index: 0, Row:0, Column:0 };
    TokenPosition: InputPosition = { Index: 0, Row:0, Column:0 };
    NonWhitespaceSinceLastNewline: boolean = false;

    constructor(originalText: string) {
        this._originalText = originalText;
    }

    Advance(isWhitespace: boolean): void {
        if (this.CurrentPosition.Index>= MaxDocSize)
            throw new Error("Maximum document length exceeded");
        this.CurrentPosition.Index += 1;
        this.CurrentPosition.Column += 1;
        this.NonWhitespaceSinceLastNewline ||= !isWhitespace;
    }

    NewLine(): void {
        if (this.CurrentPosition.Index>= MaxDocSize)
            throw new Error("Maximum document length exceeded");
        this.CurrentPosition.Index += 1;
        this.CurrentPosition.Row += 1;
        this.CurrentPosition.Column = 0;
        this.NonWhitespaceSinceLastNewline = false;
    }

    SetTokenStart() : void {
        this.TokenPosition = { ...this.CurrentPosition };
    }

    MakeTokenFromBuffer(type: TokenType, trimEnd: boolean = false): JsonToken {
        const substring = this._originalText.substring(this.TokenPosition.Index, this.CurrentPosition.Index);
        return {
            Type: type,
            Text: (trimEnd) ? substring.trimEnd() : substring,
            InputPosition: {...this.TokenPosition},
        };
    }

    MakeToken(type: TokenType, text: string): JsonToken {
        return {
            Type: type,
            Text: text,
            InputPosition: {...this.TokenPosition},
        }
    }

    Current(): number {
        return (this.AtEnd())? NaN : this._originalText.charCodeAt(this.CurrentPosition.Index);
    }

    AtEnd(): boolean {
        return this.CurrentPosition.Index >= this._originalText.length;
    }

    Throw(message: string): void {
        throw new FracturedJsonError(message, this.CurrentPosition);
    }

    private _originalText: string;
}

const MaxDocSize: number = 2000000000;
