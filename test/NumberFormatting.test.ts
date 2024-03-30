import {EolStyle, Formatter, NumberListAlignment} from "../src";

describe('Number formatting tests', function () {
    test("Inline array doesn't justify numbers", () => {
        const input = "[1, 2.1, 3, -99]";
        const expectedOutput = "[1, 2.1, 3, -99]";

        // With default options, this will be inlined, so no attempt is made to reformat or justify the numbers.
        const formatter = new Formatter();
        let output = formatter.Reformat(input, 0);

        expect(output.trimEnd()).toBe(expectedOutput);
    });

    test("Compact array does justify numbers", () => {
        const input = "[1, 2.1, 3, -99]";
        const expectedOutput = "[\n      1.0,   2.1,   3.0, -99.0\n]";

        // Here, it's formatted as a compact multiline array (but not really multiline).  All elements are formatted
        // alike, which means padding spaces on the left and zeros on the right.
        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = -1;

        let output = formatter.Reformat(input, 0);

        expect(output.trimEnd()).toBe(expectedOutput);
    });

    test("Table array does justify numbers", () => {
        const input = "[[1, 2.1, 3, -99],[5, 6, 7, 8]]";
        const expectedOutput =
            "[\n" +
            "    [1, 2.1, 3, -99], \n" +
            "    [5, 6.0, 7,   8]  \n" +
            "]";

        // Since this is table formatting, each column is consistent, but not siblings in the same array.
        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = -1;

        let output = formatter.Reformat(input, 0);

        expect(output.trimEnd()).toBe(expectedOutput);
    });

    test("Big numbers invalidate alignment 1", () => {
        const input = "[1, 2.1, 3, 1e+99]";
        const expectedOutput = "[\n    1    , 2.1  , 3    , 1e+99\n]";

        // If there's a number that requires an "E", don't try to justify the numbers.
        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = -1;

        let output = formatter.Reformat(input, 0);

        expect(output.trimEnd()).toBe(expectedOutput);
    });

    test("Big numbers invalidate alignment 2", () => {
        const input = "[1, 2.1, 3, 1234567890123456]";
        const expectedOutput = "[\n    1               , 2.1             , 3               , 1234567890123456\n]";

        // If there's a number with too many significant digits, don't try to justify the numbers.
        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = -1;

        let output = formatter.Reformat(input, 0);

        expect(output.trimEnd()).toBe(expectedOutput);
    });

    test("Nulls respected when aligning numbers", () => {
        const input = "[1, 2, null, -99]";
        const expectedOutput = "[\n       1,    2, null,  -99\n]";

        // In general, if an array contains stuff other than numbers, we don't try to justify them.  Null is an
        // exception though: an array of numbers and nulls should be justified as numbers.
        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = -1;

        let output = formatter.Reformat(input, 0);

        expect(output.trimEnd()).toBe(expectedOutput);
    });

    test("Overflow Double Invalidates Alignment", () => {
        const input = "[1e500, 4.0]";
        const expectedOutput = "[\n    1e500, 4.0  \n]";

        // If a number is too big to fit in a 64-bit float, we shouldn't try to reformat its column/array.
        // If we did, it would turn into "Infinity", isn't a valid JSON token.
        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = -1;

        let output = formatter.Reformat(input, 0);

        expect(output.trimEnd()).toBe(expectedOutput);
    });

    test("Underflow Double Invalidates Alignment", () => {
        const input = "[1e-500, 4.0]";
        const expectedOutput = "[\n    1e-500, 4.0   \n]";

        // If a number is too small to fit in a 64-bit float, we shouldn't try to reformat its column/array.
        // Doing so would change it to zero, which might be an unwelcome loss of precision.
        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = -1;

        let output = formatter.Reformat(input, 0);

        expect(output.trimEnd()).toBe(expectedOutput);
    });

    test("Left Align Matches Expected", () => {
        const expectedRows = [
            "[",
            "    [123.456 , 0      , 0   ],",
            "    [234567.8, 0      , 0   ],",
            "    [3       , 0.00000, 7e2 ],",
            "    [null    , 2e-1   , 80e1],",
            "    [5.6789  , 3.5e-1 , 0   ]",
            "]"
        ];

        TestAlignment(NumberListAlignment.Left, expectedRows);
    });

    test("Right Align Matches Expected", () => {
        const expectedRows = [
            "[",
            "    [ 123.456,       0,    0],",
            "    [234567.8,       0,    0],",
            "    [       3, 0.00000,  7e2],",
            "    [    null,    2e-1, 80e1],",
            "    [  5.6789,  3.5e-1,    0]",
            "]"
        ];

        TestAlignment(NumberListAlignment.Right, expectedRows);
    });

    test("Decimal Align Matches Expected", () => {
        const expectedRows = [
            "[",
            "    [   123.456 , 0      ,  0  ],",
            "    [234567.8   , 0      ,  0  ],",
            "    [     3     , 0.00000,  7e2],",
            "    [  null     , 2e-1   , 80e1],",
            "    [     5.6789, 3.5e-1 ,  0  ]",
            "]"
        ];

        TestAlignment(NumberListAlignment.Decimal, expectedRows);
    });

    test("Normalize Align Matches Expected", () => {
        const expectedRows = [
            "[",
            "    [   123.4560, 0.00,   0],",
            "    [234567.8000, 0.00,   0],",
            "    [     3.0000, 0.00, 700],",
            "    [  null     , 0.20, 800],",
            "    [     5.6789, 0.35,   0]",
            "]"
        ];

        TestAlignment(NumberListAlignment.Normalize, expectedRows);
    });
});

function TestAlignment(align: NumberListAlignment, expectedRows: string[]): void {
    const inputRows = [
        "[",
        "    [ 123.456, 0, 0 ],",
        "    [ 234567.8, 0, 0 ],",
        "    [ 3, 0.00000, 7e2 ],",
        "    [ null, 2e-1, 80e1 ],",
        "    [ 5.6789, 3.5e-1, 0 ]",
        "]",
    ];
    const input = inputRows.join("");

    const formatter = new Formatter();
    formatter.Options.MaxTotalLineLength = 60;
    formatter.Options.JsonEolStyle = EolStyle.Lf;
    formatter.Options.OmitTrailingWhitespace = true;
    formatter.Options.NumberListAlignment = align;

    const output = formatter.Reformat(input);
    const outputRows = output!.trimEnd().split('\n');

    expect(outputRows).toEqual(expectedRows);
}