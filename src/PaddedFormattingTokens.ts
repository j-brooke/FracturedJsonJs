import {FracturedJsonOptions} from "./FracturedJsonOptions";
import {BracketPaddingType} from "./BracketPaddingType";
import {EolStyle} from "./EolStyle";
import {JsonItemType} from "./JsonItemType";


export class PaddedFormattingTokens {
    get Comma() { return this._comma; };
    get Colon() { return this._colon; };
    get Comment() { return this._comment; };
    get EOL() { return this._eol; };
    get CommaLen() { return this._commaLen; };
    get ColonLen() { return this._colonLen; };
    get CommentLen() { return this._commentLen; };
    get PrefixStringLen() { return this._prefixStringLen; };
    get DummyComma() { return this._dummyComma; };

    constructor(opts: FracturedJsonOptions, strLenFunc: (val: string) => number) {
        this._arrStart = [];
        this._arrStart[BracketPaddingType.Empty] = "[";
        this._arrStart[BracketPaddingType.Simple] = (opts.SimpleBracketPadding) ? "[ " : "[";
        this._arrStart[BracketPaddingType.Complex] = (opts.NestedBracketPadding) ? "[ " : "[";

        this._arrEnd = [];
        this._arrEnd[BracketPaddingType.Empty] = "]";
        this._arrEnd[BracketPaddingType.Simple] = (opts.SimpleBracketPadding) ? " ]" : "]";
        this._arrEnd[BracketPaddingType.Complex] = (opts.NestedBracketPadding) ? " ]" : "]";

        this._objStart = [];
        this._objStart[BracketPaddingType.Empty] = "{";
        this._objStart[BracketPaddingType.Simple] = (opts.SimpleBracketPadding) ? "{ " : "{";
        this._objStart[BracketPaddingType.Complex] = (opts.NestedBracketPadding) ? "{ " : "{";

        this._objEnd = [];
        this._objEnd[BracketPaddingType.Empty] = "}";
        this._objEnd[BracketPaddingType.Simple] = (opts.SimpleBracketPadding) ? " }" : "}";
        this._objEnd[BracketPaddingType.Complex] = (opts.NestedBracketPadding) ? " }" : "}";


        this._comma = (opts.CommaPadding) ? ", " : ",";
        this._colon = (opts.ColonPadding) ? ": " : ":";
        this._comment = (opts.CommentPadding) ? " " : "";
        this._eol = (opts.JsonEolStyle==EolStyle.Crlf) ? "\r\n" : "\n";

        this._arrStartLen = this._arrStart.map(strLenFunc);
        this._arrEndLen = this._arrEnd.map(strLenFunc);
        this._objStartLen = this._objStart.map(strLenFunc);
        this._objEndLen = this._objEnd.map(strLenFunc);

        // Create pre-made indent strings for levels 0 and 1 now.  We'll construct and cache others as needed.
        this._indentStrings = [
            "",
            (opts.UseTabToIndent)? "\t" : " ".repeat(opts.IndentSpaces),
        ];

        // Same with spaces
        this._spaceStrings = [
            "",
            " ",
        ];

        this._commaLen = strLenFunc(this._comma);
        this._colonLen = strLenFunc(this._colon);
        this._commentLen = strLenFunc(this._comment);
        this._prefixStringLen = strLenFunc(opts.PrefixString);
        this._dummyComma = " ".repeat(this._commaLen);
    }

    ArrStart(type: BracketPaddingType): string {
        return this._arrStart[type];
    }
    ArrEnd(type: BracketPaddingType): string {
        return this._arrEnd[type];
    }
    ObjStart(type: BracketPaddingType): string {
        return this._objStart[type];
    }
    ObjEnd(type: BracketPaddingType): string {
        return this._objEnd[type];
    }

    Start(elemType: JsonItemType, bracketType: BracketPaddingType): string {
        return (elemType==JsonItemType.Array)? this.ArrStart(bracketType) : this.ObjStart(bracketType);
    }

    End(elemType: JsonItemType, bracketType: BracketPaddingType): string {
        return (elemType==JsonItemType.Array)? this.ArrEnd(bracketType) : this.ObjEnd(bracketType);
    }

    ArrStartLen(type: BracketPaddingType): number {
        return this._arrStartLen[type];
    }
    ArrEndLen(type: BracketPaddingType): number {
        return this._arrEndLen[type];
    }
    ObjStartLen(type: BracketPaddingType): number {
        return this._objStartLen[type];
    }
    ObjEndLen(type: BracketPaddingType): number {
        return this._objEndLen[type];
    }

    StartLen(elemType: JsonItemType, bracketType: BracketPaddingType): number {
        return (elemType==JsonItemType.Array)? this.ArrStartLen(bracketType) : this.ObjStartLen(bracketType);
    }

    EndLen(elemType: JsonItemType, bracketType: BracketPaddingType): number {
        return (elemType==JsonItemType.Array)? this.ArrEndLen(bracketType) : this.ObjEndLen(bracketType);
    }

    Indent(level: number): string {
        if (level >= this._indentStrings.length) {
            for (let i = this._indentStrings.length; i <= level; ++i)
                this._indentStrings.push(this._indentStrings[i-1] + this._indentStrings[1]);
        }

        return this._indentStrings[level];
    }

    Spaces(level: number): string {
        if (level >= this._spaceStrings.length) {
            for (let i = this._spaceStrings.length; i <= level; ++i)
                this._spaceStrings.push(" ".repeat(i));
        }

        return this._spaceStrings[level];
    }

    private readonly _comma: string;
    private readonly _colon: string;
    private readonly _comment: string;
    private readonly _eol: string;
    private readonly _dummyComma: string;
    private readonly _commaLen: number;
    private readonly _colonLen: number;
    private readonly _commentLen: number;
    private readonly _prefixStringLen: number;

    private readonly _arrStart: string[];
    private readonly _arrEnd: string[];
    private readonly _objStart: string[];
    private readonly _objEnd: string[];
    private readonly _arrStartLen: number[];
    private readonly _arrEndLen: number[];
    private readonly _objStartLen: number[];
    private readonly _objEndLen: number[];
    private readonly _indentStrings: string[];
    private readonly _spaceStrings: string[];
}
