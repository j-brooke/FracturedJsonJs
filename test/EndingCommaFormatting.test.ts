import {Formatter} from "../src";
import {CommentPolicy} from "../src";

// Tests to make sure commas are only where they're supposed to be.
describe("Ending comma formatting tests", () => {
    // Tests that comments at the end of an expanded object/array don't cause commas before them.
    test("No commas for comments expanded", () => {
        const inputLines = [
            "[",
            "/*a*/",
            "1, false",
            "/*b*/",
            "]"
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // Both comments here are standalone, so we're not allowed to format this as inline or compact-array.
        // The row types are dissimilar, so they won't be table-formatted either.
        expect(outputLines.length).toBe(6);

        // There should only be one comma - between the 1 and false.
        const commaCount = output.match(/,/g)?.length ?? 0;
        expect(commaCount).toBe(1);
    });

    // Tests that comments at the end of a table-formatted object/array don't cause commas before them.
    test("No commas for comments table", () => {
        const inputLines = [
            "[",
            "/*a*/",
            "[1], [false]",
            "/*b*/",
            "]"
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // Both comments here are standalone, so we're not allowed to format this as inline or compact-array.
        // The row types are both array, so it should be table-formatted.
        expect(outputLines.length).toBe(6);
        expect(output).toContain("[1    ]");

        // There should only be one comma - between the 1 and 2.
        const commaCount = output.match(/,/g)?.length ?? 0;
        expect(commaCount).toBe(1);
    });
});
