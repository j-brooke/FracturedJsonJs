import {Formatter} from "../src";
// @ts-ignore
import {DoInstancesLineUp} from "./Helpers";

// Tests for the AlwaysExpandDepth setting.
describe("Always Expand Formatting Tests", () => {
    test("Always expand depth honored", () => {
        const inputLines = [
            "[",
            "[ {'x':1}, false ],",
            "{ 'a':[2], 'b':[3] }",
            "]"
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = 100;
        formatter.Options.MaxTotalLineLength = Number.MAX_VALUE;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // With high maximum complexity and long line length, it should all be in one line.
        expect(outputLines.length).toBe(1);

        formatter.Options.AlwaysExpandDepth = 0;
        output = formatter.Reformat(input, 0);
        outputLines = output.trimEnd().split('\n');

        // If we force expanding at depth 0, we should get 4 lines (more or less like the input).
        expect(outputLines.length).toBe(4);

        formatter.Options.AlwaysExpandDepth = 1;
        output = formatter.Reformat(input, 0);
        outputLines = output.trimEnd().split('\n');

        // If we force expanding at depth 1, we'll get lots of lines.
        expect(outputLines.length).toBe(10);
    });

    test("AlwaysExpandDepth doesn't prevent table formatting", () => {
        const input = "[ [1, 22, 9 ], [333, 4, 9 ] ]";

        const formatter = new Formatter();
        formatter.Options.AlwaysExpandDepth = 0;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        expect(outputLines.length).toBe(4);
        expect(DoInstancesLineUp(outputLines, ",")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "9")).toBeTruthy();
    });
});
