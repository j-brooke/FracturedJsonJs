import {TokenGenerator} from "../src/TokenGenerator";
import {TokenType} from "../src/TokenType";
import {FracturedJsonError} from "../src";
import {JsonToken} from "../src/JsonToken";

// Tests for the TokenGenerator.
describe("Tokenizer Tests", () => {
    test.each([
        ["{", TokenType.BeginObject],
        ["}", TokenType.EndObject],
        ["[", TokenType.BeginArray],
        ["]", TokenType.EndArray],
        [":", TokenType.Colon],
        [",", TokenType.Comma],
        ["true", TokenType.True],
        ["false", TokenType.False],
        ["null", TokenType.Null],
        ['"simple"', TokenType.String],
        ['"with \\t escapes\\u80fE\\r\\n"', TokenType.String],
        ['""', TokenType.String],
        ["3", TokenType.Number],
        ["3.0", TokenType.Number],
        ["-3", TokenType.Number],
        ["-3.0", TokenType.Number],
        ["0", TokenType.Number],
        ["-0", TokenType.Number],
        ["0.0", TokenType.Number],
        ["9000", TokenType.Number],
        ["3e2", TokenType.Number],
        ["3.01e+2", TokenType.Number],
        ["3e-2", TokenType.Number],
        ["-3.01E-2", TokenType.Number],
        ["\n", TokenType.BlankLine],
        ["//\n", TokenType.LineComment],
        ["// comment\n", TokenType.LineComment],
        ["// comment", TokenType.LineComment],
        ["/**/", TokenType.BlockComment],
        ["/* comment */", TokenType.BlockComment],
        ["/* comment\n *with* newline */", TokenType.BlockComment],
    ])('Echoes token %s', (input:string, type:TokenType) => {
        // The only case where we don't expect an exact match: a line comment token won't include the terminal \n
        const possiblyTrimmedInput = (type==TokenType.LineComment)? input.trimEnd() : input;

        const results = [...TokenGenerator(input)];
        expect(results.length).toBe(1);
        expect(results[0].Text).toBe(possiblyTrimmedInput);
        expect(results[0].Type).toBe(type);
    });

    test.each([
        ["{,", 1, 0, 1],
        ["null,", 4, 0, 4],
        ["3,", 1, 0, 1],
        ["3.12,", 4, 0, 4],
        ["3e2,", 3, 0, 3],
        ['"st",', 4, 0, 4],
        ["null ,", 5, 0, 5],
        ["null\t,", 5, 0, 5],
        ["null\n,", 5, 1, 0],
        [" null \r\n ,", 9, 1, 1],
        ["//co\n,", 5, 1, 0],
        ["/**/,", 4, 0, 4],
        ["/*1*/,", 5, 0, 5],
        ["/*1\n*/,", 6, 1, 2],
        ["\n\n", 1, 1, 0],
    ])("Correct position for second token in %s", (input:string, index:number, row:number, column:number) => {
        const results = [...TokenGenerator(input)];

        expect(results.length).toBe(2);
        expect(results[1].InputPosition.Index).toBe(index);
        expect(results[1].InputPosition.Row).toBe(row);
        expect(results[1].InputPosition.Column).toBe(column);

        const expectedText = (results[0].Type==TokenType.BlankLine)? input.substring(0, index)
            : input.substring(0, index).trim();
        expect(results[0].Text).toBe(expectedText);
    });

    test.each([
        ["t"],
        ["nul"],
        ["/"],
        ["/*"],
        ["/* comment *"],
        ['"'],
        ['"string'],
        ['"string with escaped quote\\"'],
        ["1."],
        ["-"],
        ["1.0e"],
        ["1.0e+"],
    ])("Throw if unexpected end in %s", (input:string) => {
        let exceptionHappened = false;
        try {
            [...TokenGenerator(input)];
        }
        catch (err: unknown) {
            expect(err).toBeInstanceOf(FracturedJsonError);

            const fjErr = err as FracturedJsonError;
            expect(fjErr.InputPosition).toBeTruthy();
            expect(fjErr.InputPosition?.Index).toBe(input.length);
            exceptionHappened = true;
        }

        expect(exceptionHappened).toBeTruthy();
    });

    test("Token sequences match sample", () => {
        // Keep each row 28 characters (plus 2 for eol) to make it easy to figure the expected index.
        const inputRows = [
            '{                           ',
            '    // A line comment       ',
            '    "item1": "a string",    ',
            '                            ',
            '    /* a block              ',
            '       comment */           ',
            '    "item2": [null, -2.0]   ',
            '}                           '
        ];
        const inputString = inputRows.join('\r\n');
        const blockCommentText = inputRows[4].trimStart() + '\r\n' + inputRows[5].trimEnd();

        const expectedTokens:JsonToken[] = [
            {Type:TokenType.BeginObject, Text:"{", InputPosition: {Index:0, Row:0, Column:0}},
            {Type:TokenType.LineComment, Text:"// A line comment", InputPosition: {Index:34, Row:1, Column:4}},
            {Type:TokenType.String, Text:"\"item1\"", InputPosition: {Index:64, Row:2, Column:4}},
            {Type:TokenType.Colon, Text:":", InputPosition: {Index:71, Row:2, Column:11}},
            {Type:TokenType.String, Text:"\"a string\"", InputPosition: {Index:73, Row:2, Column:13}},
            {Type:TokenType.Comma, Text:",", InputPosition: {Index:83, Row:2, Column:23}},
            {Type:TokenType.BlankLine, Text:"\n", InputPosition: {Index:90, Row:3, Column:0}},
            {Type:TokenType.BlockComment, Text:blockCommentText, InputPosition: {Index:124, Row:4, Column:4}},
            {Type:TokenType.String, Text:"\"item2\"", InputPosition: {Index:184, Row:6, Column:4}},
            {Type:TokenType.Colon, Text:":", InputPosition: {Index:191, Row:6, Column:11}},
            {Type:TokenType.BeginArray, Text:"[", InputPosition: {Index:193, Row:6, Column:13}},
            {Type:TokenType.Null, Text:"null", InputPosition: {Index:194, Row:6, Column:14}},
            {Type:TokenType.Comma, Text:",", InputPosition: {Index:198, Row:6, Column:18}},
            {Type:TokenType.Number, Text:"-2.0", InputPosition: {Index:200, Row:6, Column:20}},
            {Type:TokenType.EndArray, Text:"]", InputPosition: {Index:204, Row:6, Column:24}},
            {Type:TokenType.EndObject, Text:"}", InputPosition: {Index:210, Row:7, Column:0}},
        ];

        const results = [...TokenGenerator(inputString)];
        expect(results).toEqual(expectedTokens);
    });

    test("Empty input is handled", () => {
        const results = [...TokenGenerator("")];
        expect(results.length).toBe(0);
    });
})
