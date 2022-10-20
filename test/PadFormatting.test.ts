
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
});
