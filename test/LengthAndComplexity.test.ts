import {Formatter} from "../src";


describe("Length and complexity tests", () => {
    // Test a specific piece of input with a variety of MaxInlineComplexity settings, and compare
    // the number of lines in the output to the expected values.
    test.each([
        [4, 1], // All on one line
        [3, 3], // Outer-most brackets on their own lines
        [2, 6], // Q & R each get their own rows, plus outer [ {...} ]
        [1, 9], // Q gets broken up.  R stays inline.
        [0, 14] // Maximum expansion, basically
    ])("Correct line count for inline complexity", (maxComp: number, expNumLines: number) => {
        const inputLines = [
            "[",
            "    { 'Q': [ {'foo': 'bar'}, 678 ], 'R': [ {}, 'asdf'] }",
            "]",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.MaxTotalLineLength = 90;
        formatter.Options.MaxInlineComplexity = maxComp;
        formatter.Options.MaxCompactArrayComplexity = -1;
        formatter.Options.MaxTableRowComplexity = -1;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        expect(outputLines.length).toBe(expNumLines);
    });

    // Tests a known piece of input against multiple values of MaxCompactArrayComplexity.
    test.each([
        [2, 5], // 3 formatted columns across 3 lines plus the outer []
        [1, 9] // Each subarray gets its own line, plus the outer []
    ])("Correct line count for multiline compact", (maxComp: number, expNumLines: number) => {
        const inputLines = [
            "[",
            "    [1,2,3], [4,5,6], [7,8,9], [null,11,12], [13,14,15], [16,17,18], [19,null,21]",
            "]",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.MaxTotalLineLength = 60;
        formatter.Options.MaxInlineComplexity = 2;
        formatter.Options.MaxCompactArrayComplexity = maxComp;
        formatter.Options.MaxTableRowComplexity = -1;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        expect(outputLines.length).toBe(expNumLines);
    });

    // Tests a single piece of sample data with multiple length settings, and compares the number of output
    // lines with the expected output.
    test.each([
        [120, 100, 3, 1], // All on one line
        [120, 90, 3, 4], // Two row compact multiline array, + two for []
        [120, 70, 3, 5], // Three row compact multiline array, + two for []
        [120, 50, 3, 9], // Not a compact multiline array.  1 per inner array, + two for [].
        [120, 50, 2, 6], // Four row compact multiline array, + two for []
        [90, 120, 3, 4], // Two row compact multiline array, + two for []
        [70, 120, 3, 4], // Also two row compact multiline array, + two for []
        [65, 120, 3, 5], // Three row compact multiline array, + two for []
    ])("Correct line count for line length", (inlineLen:number, totalLen:number, itemsPerRow:number, expLines:number) => {
        const inputLines = [
            "[",
            "    [1,2,3], [4,5,6], [7,8,9], [null,11,12], [13,14,15], [16,17,18], [19,null,21]",
            "]",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.MaxInlineLength = inlineLen;
        formatter.Options.MaxTotalLineLength = totalLen;
        formatter.Options.MaxInlineComplexity = 2;
        formatter.Options.MaxCompactArrayComplexity = 2;
        formatter.Options.MaxTableRowComplexity =  2;
        formatter.Options.MinCompactArrayRowItems = itemsPerRow;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        expect(outputLines.length).toBe(expLines);
    })
});
