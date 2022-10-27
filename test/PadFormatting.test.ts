
// Unit tests for various padding functionality and maybe indentation
import {readFileSync} from "fs";
import {Formatter} from "../src";

describe("Pad formatting tests", () => {
    test("No spaces anywhere", () => {
        const filePath = "./test/StandardJsonFiles/1.json";
        const input = readFileSync(filePath).toString();

        // Turn off all padding (except comments - not worrying about that here).  Use tabs to indent.  Disable
        // compact multiline arrays.  There will be no spaces anywhere.
        const formatter = new Formatter();
        formatter.Options.UseTabToIndent = true;
        formatter.Options.ColonPadding = false;
        formatter.Options.CommaPadding = false;
        formatter.Options.NestedBracketPadding = false;
        formatter.Options.SimpleBracketPadding = false;
        formatter.Options.MaxCompactArrayComplexity = 0;
        formatter.Options.MaxTableRowComplexity = -1;

        let output = formatter.Reformat(input, 0);

        expect(output).not.toContain(" ");
    });

    test("SimpleBracketPadding works for tables", () => {
        const input = "[[1, 2],[3, 4]]";

        // Limit the complexity to make sure we format this as a table, but set SimpleBracketPadding to true.
        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = 1;
        formatter.Options.SimpleBracketPadding = true;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // There should be spaces between the brackets and the numbers.
        expect(outputLines.length).toBe(4);
        expect(outputLines[1]).toContain("[ 1, 2 ]");
        expect(outputLines[2]).toContain("[ 3, 4 ]");

        formatter.Options.SimpleBracketPadding = false;
        output = formatter.Reformat(input, 0);
        outputLines = output.trimEnd().split('\n');

        // There should NOT be spaces between the brackets and the numbers.
        expect(outputLines.length).toBe(4);
        expect(outputLines[1]).toContain("[1, 2]");
        expect(outputLines[2]).toContain("[3, 4]");
    });
});
