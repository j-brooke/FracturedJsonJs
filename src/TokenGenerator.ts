import {JsonToken} from "./JsonToken";
import {ScannerState} from "./ScannerState";
import {TokenType} from "./TokenType";

/**
 * Converts a sequence of characters into a sequence of JSON tokens.  There's no guarantee that the tokens make
 * sense - just that they're lexically correct.
 */
export function* TokenGenerator(inputJson: string): Generator<JsonToken> {
    const state = new ScannerState(inputJson);

    while (true) {
        if (state.AtEnd())
            return;

        // With the exception of whitespace, all of the characters examined in the switch below will send us to
        // a function that will potentially read more characters and either return the appropriate token, or
        // throw a FracturedJsonError.  If there is no error, state.Current() will be pointing to the character
        // *after* the last one in the token that was read.
        //
        // Note that we're comparing the numeric (UTF16, I guess) form of the character to constants - or as close
        // as we can reasonable come to them.  The alternative is to create a new single-character string at every
        // step and then do string comparisons.  I'm assuming the numbers are faster, but who knows.
        const ch = state.Current();
        switch (ch) {
            case _codeSpace:
            case _codeTab:
            case _codeCR:
                // Regular unremarkable whitespace.
                state.Advance(true);
                break;

            case _codeLF:
                // If a line contained only whitespace, return a blank line.  Note that we're ignoring CRs.  If
                // we get a Window's style CRLF, we throw away the CR, and then trigger on the LF just like we would
                // for Unix.
                if (!state.NonWhitespaceSinceLastNewline)
                    yield state.MakeToken(TokenType.BlankLine, "\n");

                state.NewLine();

                // If this new line turns out to be nothing but whitespace, we want to report the blank line
                // token as starting at the beginning of the line.  Otherwise you get into \r\n vs. \n issues.
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

            case _codeLittleT:
                yield ProcessKeyword(state, "true", TokenType.True);
                break;
            case _codeLittleF:
                yield ProcessKeyword(state, "false", TokenType.False);
                break;
            case _codeLittleN:
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
    state.SetTokenStart();

    if (state.AtEnd())
        state.Throw("Unexpected end of input while processing comment");

    state.Advance(false);
    let isBlockComment = false;
    if (state.Current()==_codeStar)
        isBlockComment = true;
    else if (state.Current()!=_codeSlash)
        state.Throw("Bad character for start of comment");

    state.Advance(false);
    let lastCharWasAsterisk = false;
    while (true) {
        if (state.AtEnd()) {
            // If the input ends while we're in the middle of a block comment, treat it as an error.  If it
            // ends in the middle of a line comment, treat the comment as valid.
            if (isBlockComment)
                state.Throw("Unexpected end of input while processing comment");
            else
                return state.MakeTokenFromBuffer(TokenType.LineComment, true);
        }

        const ch = state.Current();
        if (ch==_codeLF) {
            state.NewLine();
            if (!isBlockComment)
                return state.MakeTokenFromBuffer(TokenType.LineComment, true);
            continue;
        }

        state.Advance(false);
        if (ch == _codeSlash && lastCharWasAsterisk)
            return state.MakeTokenFromBuffer(TokenType.BlockComment);

        lastCharWasAsterisk = (ch==_codeStar);
    }
}

function ProcessString(state: ScannerState): JsonToken {
    state.SetTokenStart();
    state.Advance(false);

    let lastCharBeganEscape = false;
    let expectedHexCount = 0;
    while (true) {
        if (state.AtEnd())
            state.Throw("Unexpected end of input while processing string");

        const ch = state.Current();

        if (expectedHexCount > 0) {
            if (!isHex(ch))
                state.Throw("Bad unicode escape in string");
            expectedHexCount -= 1;
            state.Advance(false);
            continue;
        }

        // Only certain characters are allowed after backslashes.  The only ones that affect us here are
        // \u, which needs to be followed by 4 hex digits, and \", which should not end the string.
        if (lastCharBeganEscape) {
            if (!isLegalAfterBackslash(ch))
                state.Throw("Bad escaped character in string");
            if (ch == _codeLittleU)
                expectedHexCount = 4;
            lastCharBeganEscape = false;
            state.Advance(false);
            continue;
        }

        if (isControl(ch))
            state.Throw("Control characters are not allowed in strings");

        state.Advance(false);
        if (ch==_codeQuote)
            return state.MakeTokenFromBuffer(TokenType.String);
        if (ch==_codeBackSlash)
            lastCharBeganEscape = true;
    }
}

function ProcessNumber(state: ScannerState): JsonToken {
    state.SetTokenStart();

    let phase = NumberPhase.Beginning;
    while (true) {
        const ch = state.Current();
        let handling = CharHandling.ValidAndConsumed;

        switch (phase) {
            case NumberPhase.Beginning:
                if (ch == _codeMinus)
                    phase = NumberPhase.PastLeadingSign;
                else if (ch == _codeZero)
                    phase = NumberPhase.PastWhole;
                else if (isDigit(ch))
                    phase = NumberPhase.PastFirstDigitOfWhole;
                else
                    handling = CharHandling.InvalidatesToken;
                break;

            case NumberPhase.PastLeadingSign:
                if (!isDigit(ch))
                    handling = CharHandling.InvalidatesToken;
                else if (ch == _codeZero)
                    phase = NumberPhase.PastWhole;
                else
                    phase = NumberPhase.PastFirstDigitOfWhole;
                break;

            // We've started with a 1-9 and more digits are welcome.
            case NumberPhase.PastFirstDigitOfWhole:
                if (ch == _codeDecimal)
                    phase = NumberPhase.PastDecimalPoint;
                else if (ch == _codeLittleE || ch == _codeBigE)
                    phase = NumberPhase.PastE;
                else if (!isDigit(ch))
                    handling = CharHandling.StartOfNewToken;
                break;

            // We started with a 0.  Another digit at this point would not be part of this token.
            case NumberPhase.PastWhole:
                if (ch == _codeDecimal)
                    phase = NumberPhase.PastDecimalPoint;
                else if (ch == _codeLittleE || ch == _codeBigE)
                    phase = NumberPhase.PastE;
                else
                    handling = CharHandling.StartOfNewToken;
                break;

            case NumberPhase.PastDecimalPoint:
                if (isDigit(ch))
                    phase = NumberPhase.PastFirstDigitOfFractional;
                else
                    handling = CharHandling.InvalidatesToken;
                break;

            case NumberPhase.PastFirstDigitOfFractional:
                if (ch == _codeLittleE || ch == _codeBigE)
                    phase = NumberPhase.PastE;
                else if (!isDigit(ch))
                    handling = CharHandling.StartOfNewToken;
                break;

            // An E must be followed by either a digit or +/-
            case NumberPhase.PastE:
                if (ch == _codePlus || ch == _codeMinus)
                    phase = NumberPhase.PastExpSign;
                else if (isDigit(ch))
                    phase = NumberPhase.PastFirstDigitOfExponent;
                else
                    handling = CharHandling.InvalidatesToken;
                break;

            // E and a +/- must still be followed by one or more digits.
            case NumberPhase.PastExpSign:
                if (isDigit(ch))
                    phase = NumberPhase.PastFirstDigitOfExponent;
                else
                    handling = CharHandling.InvalidatesToken;
                break;

            case NumberPhase.PastFirstDigitOfExponent:
                if (!isDigit(ch))
                    handling = CharHandling.StartOfNewToken;
                break;
        }

        if (handling == CharHandling.InvalidatesToken)
            state.Throw("Bad character while processing number");

        if (handling == CharHandling.StartOfNewToken) {
            // We're done processing the number, and the enumerator is pointed to the character after it.
            return state.MakeTokenFromBuffer(TokenType.Number);
        }

        if (!state.AtEnd()) {
            state.Advance(false);
            continue;
        }

        // We've reached the end of the input.  Figure out if we read a complete token or not.
        switch (phase) {
            case NumberPhase.PastFirstDigitOfWhole:
            case NumberPhase.PastWhole:
            case NumberPhase.PastFirstDigitOfFractional:
            case NumberPhase.PastFirstDigitOfExponent:
                return state.MakeTokenFromBuffer(TokenType.Number);
            default:
                state.Throw("Unexpected end of input while processing number");
                break;
        }
    }
}

// Number versions of various important characters.  I assume it's quicker to compare against these than doing
// a bunch of single-character string compared.  But it's possible the JS engine has some slick optimizations for
// that case.
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
const _codePlus = "+".charCodeAt(0);
const _codeMinus = "-".charCodeAt(0);
const _codeDecimal = ".".charCodeAt(0);
const _codeZero = "0".charCodeAt(0);
const _codeNine = "9".charCodeAt(0);
const _codeLittleA = "a".charCodeAt(0);
const _codeBigA = "A".charCodeAt(0);
const _codeLittleB = "b".charCodeAt(0);
const _codeLittleE = "e".charCodeAt(0);
const _codeBigE = "E".charCodeAt(0);
const _codeLittleF = "f".charCodeAt(0);
const _codeBigF = "F".charCodeAt(0);
const _codeLittleN = "n".charCodeAt(0);
const _codeLittleR = "r".charCodeAt(0);
const _codeLittleT = "t".charCodeAt(0);
const _codeLittleU = "u".charCodeAt(0);


function isDigit(charCode:number): boolean {
    return charCode>=_codeZero && charCode<=_codeNine;
}

function isHex(charCode:number): boolean {
    return (charCode>=_codeZero && charCode<=_codeNine)
        || (charCode>=_codeLittleA && charCode<=_codeLittleF)
        || (charCode>=_codeBigA && charCode<=_codeBigF);
}

function isLegalAfterBackslash(charCode:number): boolean {
    switch (charCode) {
        case _codeQuote:
        case _codeBackSlash:
        case _codeSlash:
        case _codeLittleB:
        case _codeLittleF:
        case _codeLittleN:
        case _codeLittleR:
        case _codeLittleT:
        case _codeLittleU:
            return true;
        default:
            return false;
    }
}

function isControl(charCode:number): boolean {
    return (charCode>=0x00 && charCode<=0x1F)
        || (charCode == 0x7F)
        || (charCode>=0x80 && charCode<=0x9F);
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

enum CharHandling {
    InvalidatesToken,
    ValidAndConsumed,
    StartOfNewToken,
}

