import {InputPosition} from "./InputPosition";
import {TokenType} from "./TokenType";
import {JsonToken} from "./JsonToken";
import {FracturedJsonException} from "./FracturedJsonException";

/**
 * Class for keeping track of info while scanning text into JSON tokens.
 */
export class ScannerState {
    Buffer: string = "";
    CurrentPosition: InputPosition = { Index: 0, Row:0, Column:0 };
    TokenPosition: InputPosition = { Index: 0, Row:0, Column:0 };
    NonWhitespaceSinceLastNewline: boolean = false;

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
        return {
            Type: type,
            Text: (trimEnd) ? this.Buffer.trimEnd() : this.Buffer,
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

    Throw(message: string): void {
        throw FracturedJsonException(message, this.CurrentPosition);
    }
}

const MaxDocSize: number = 2000000000;
