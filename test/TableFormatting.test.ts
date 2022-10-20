// Tests about formatting things in tables, so that corresponding properties and array positions are neatly
// lined up, when possible.
import {Formatter} from "../src";
// @ts-ignore
import {DoInstancesLineUp} from "./Helpers";
import {CommentPolicy} from "../src";

describe("Table formatting tests", () => {
    test("Nested elements line up", () => {
        const inputLines = [
            "{",
            "    'Rect' : { 'position': {'x': -44, 'y':  3.4}, 'color': [0, 255, 255] }, ",
            "    'Point': { 'position': {'y': 22, 'z': 3} }, ",
            "    'Oval' : { 'position': {'x': 140, 'y':  0.04}, 'color': '#7f3e96' }  ",
            "}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');

        // With default options, this will be neatly formatted as a table.
        const formatter = new Formatter();

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // Everything should line up.
        expect(DoInstancesLineUp(outputLines, "x")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "y")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "z")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "position")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "color")).toBeTruthy();

        // The numbers of the y column will be justified.
        expect(outputLines[2]).toContain("22.00,");
    });

    test("Nested elements compact when needed", () => {
        const inputLines = [
            "{",
            "    'Rect' : { 'position': {'x': -44, 'y':  3.4}, 'color': [0, 255, 255] }, ",
            "    'Point': { 'position': {'y': 22, 'z': 3} }, ",
            "    'Oval' : { 'position': {'x': 140, 'y':  0.04}, 'color': '#7f3e96' }  ",
            "}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');

        // Smaller rows, so there's not enough room to do a full table.
        const formatter = new Formatter();
        formatter.Options.MaxTotalLineLength = 77;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // Since the available size is reduced, x,y,z will no longer line up, but position and color will.
        expect(DoInstancesLineUp(outputLines, "position")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "color")).toBeTruthy();

        // The numbers of the y column will be justified.
        expect(outputLines[2]).toContain("22,");
    });

    test("Nested elements compact when needed", () => {
        const inputLines = [
            "{",
            "    'Rect' : { 'position': {'x': -44, 'y':  3.4}, 'color': [0, 255, 255] }, ",
            "    'Point': { 'position': {'y': 22, 'z': 3} }, ",
            "    'Oval' : { 'position': {'x': 140, 'y':  0.04}, 'color': '#7f3e96' }  ",
            "}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');

        // In this case, it's too small to do any table formatting.  But each row should still be inlined.
        const formatter = new Formatter();
        formatter.Options.MaxTotalLineLength = 74;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // All rows should be inlined, so a total of 5 rows.
        expect(outputLines.length).toBe(5);

        // Not even position lines up here.
        expect(outputLines[1].indexOf("position")).not.toBe(outputLines[2].indexOf("position"));
    });

    test("Tables with comments line up", () => {
        const inputLines = [
            "{",
            "'Firetruck': /* red */ { 'color': '#CC0000' }, ",
            "'Dumptruck': /* yellow */ { 'color': [255, 255, 0] }, ",
            "'Godzilla': /* green */  { 'color': '#336633' },  // Not a truck",
            "/* ! */ 'F150': { 'color': null } ",
            "}"
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');

        // Need to be wide enough and allow comments.
        const formatter = new Formatter();
        formatter.Options.MaxTotalLineLength = 100;
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // All rows should be inlined, so a total of 6 rows.
        expect(outputLines.length).toBe(6);

        // Lots of stuff to line up here.
        expect(DoInstancesLineUp(outputLines, '"')).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, ":")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, " {")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, " }")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "color")).toBeTruthy();
    });

    test("Tables with blank lines line up", () => {
        const inputLines = [
            "{'a': [7,8],",
            "",
            "//1",
            "'b': [9,10]}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');

        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.PreserveBlankLines = true;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // All rows should be inlined, so a total of 6 rows.
        expect(outputLines.length).toBe(6);

        // The presence of comments and blank lines shouldn't prevent table formatting.
        expect(DoInstancesLineUp(outputLines, ":")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "[")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "]")).toBeTruthy();
    });

    test("Reject objects with duplicate keys", () => {
        // Here we have an object with duplicate 'z' keys.  This is legal in JSON, even though it's hard to imagine
        // any case where it would actually happen.  Still, we want to reproduce the data faithfully, so
        // we mustn't try to format it as a table.
        const inputLines = [
            "[ { 'x': 1, 'y': 2, 'z': 3 },",
            "{ 'y': 44, 'z': 55, 'z': 66 } ]",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');

        const formatter = new Formatter();
        formatter.Options.MaxInlineComplexity = 1;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // The brackets and each object get their own rows.
        expect(outputLines.length).toBe(4);

        // We don't expect the y's to line up.
        expect(outputLines[1].indexOf("y")).not.toBe(outputLines[2].indexOf("y"));

        // There should be 3 z's in the output, just like in the input.
        const zCount = output.match(/z/g)?.length ?? 0;
        expect(zCount).toBe(3);
    });
});
