import {JsonToken} from "./JsonToken";
import {ScannerState} from "./ScannerState";
import {TokenType} from "./TokenType";

export function* TokenGenerator(inputJson: string): Generator<JsonToken> {
    const state = new ScannerState(inputJson);

    while (true) {
        if (state.AtEnd())
            return;

        const ch = state.Current();
        switch (ch) {
            case _codeSpace:
            case _codeTab:
            case _codeCR:
                state.Advance(true);
                break;

            case _codeLF:
                if (!state.NonWhitespaceSinceLastNewline)
                    yield state.MakeToken(TokenType.BlankLine, "\n");

                state.NewLine();
                state.SetTokenStart();
                break;

            case _codeOpenCurly:
                yield ProcessSingleChar(state, "{", TokenType.BeginObject);
                break;
            case _codeCloseCurly:
                yield ProcessSingleChar(state, "}", TokenType.EndObject);
                break;
            case _codeOpenSquare:
                yield ProcessSingleChar(state, "[", TokenType.BeginArray);
                break;
            case _codeCloseSquare:
                yield ProcessSingleChar(state, "]", TokenType.EndArray);
                break;

            case _codeColon:
                yield ProcessSingleChar(state, ":", TokenType.Colon);
                break;
            case _codeComma:
                yield ProcessSingleChar(state, ",", TokenType.Comma);
                break;

            case _codeT:
                yield ProcessKeyword(state, "true", TokenType.True);
                break;
            case _codeF:
                yield ProcessKeyword(state, "false", TokenType.False);
                break;
            case _codeN:
                yield ProcessKeyword(state, "null", TokenType.Null);
                break;

            case _codeSlash:
                yield ProcessComment(state);
                break;

            case _codeQuote:
                yield ProcessString(state);
                break;

            case _codeMinus:
                yield ProcessNumber(state);
                break;

            default:
                if (!isDigit(ch))
                    state.Throw("Unexpected character");
                yield ProcessNumber(state);
                break;
        }
    }
}

function ProcessSingleChar(state: ScannerState, symbol: string, type: TokenType): JsonToken {
    state.SetTokenStart();
    const token = state.MakeToken(type, symbol);
    state.Advance(false);
    return token;
}

function ProcessKeyword(state: ScannerState, keyword: string, type: TokenType): JsonToken {
    state.SetTokenStart();
    for (let i=1; i<keyword.length; ++i) {
        if (state.AtEnd())
            state.Throw("Unexpected end of input while processing keyword");
        state.Advance(false);
        if (state.Current() != keyword.charCodeAt(i))
            state.Throw("Unexpected keyword");
    }

    const token = state.MakeToken(type, keyword);
    state.Advance(false);
    return token;
}

function ProcessComment(state: ScannerState): JsonToken {
    // TODO
}

function ProcessString(state: ScannerState): JsonToken {
    // TODO
}

function ProcessNumber(state: ScannerState): JsonToken {
    // TODO
}

const _codeSpace = " ".charCodeAt(0);
const _codeLF = "\n".charCodeAt(0);
const _codeCR = "\r".charCodeAt(0);
const _codeTab = "\t".charCodeAt(0);
const _codeSlash = "/".charCodeAt(0);
const _codeStar = "*".charCodeAt(0);
const _codeBackSlash = "\\".charCodeAt(0);
const _codeQuote = "\"".charCodeAt(0);
const _codeOpenCurly = "{".charCodeAt(0);
const _codeCloseCurly = "}".charCodeAt(0);
const _codeOpenSquare = "[".charCodeAt(0);
const _codeCloseSquare = "]".charCodeAt(0);
const _codeColon = ":".charCodeAt(0);
const _codeComma = ",".charCodeAt(0);
const _codeMinus = "-".charCodeAt(0);
const _codeT = "t".charCodeAt(0);
const _codeF = "f".charCodeAt(0);
const _codeN = "n".charCodeAt(0);
const _codeLittleE = "e".charCodeAt(0);
const _codeBigE = "E".charCodeAt(0);
const _codeU = "u".charCodeAt(0);
const _codeZero = "0".charCodeAt(0);
const _codeNine = "9".charCodeAt(0);

function isDigit(charCode:number): boolean {
    return charCode>=_codeZero && charCode<=_codeNine;
}

enum NumberPhase {
    Beginning,
    PastLeadingSign,
    PastFirstDigitOfWhole,
    PastWhole,
    PastDecimalPoint,
    PastFirstDigitOfFractional,
    PastE,
    PastExpSign,
    PastFirstDigitOfExponent,
}

