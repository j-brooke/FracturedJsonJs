// Tests about formatting things in tables, so that corresponding properties and array positions are neatly
// lined up, when possible.
import {CommentPolicy, EolStyle, Formatter, NumberListAlignment} from "../src";
// @ts-ignore
import {DoInstancesLineUp} from "./Helpers";
import {TableCommaPlacement} from "../src/TableCommaPlacement";

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

    test("Commas before padding works", () => {
        const inputLines = [
            "{",
            "    'Rect' : { 'glow': 'steady', 'position': {'x': -44, 'y':  4}, 'color': [0, 255, 255] }, ",
            "    'Point': { 'glow': 'pulse', 'position': {'y': 22, 'z': 3} }, ",
            "    'Oval' : { 'glow': 'gradient', 'position': {'x': 140.33, 'y':  0.1}, 'color': '#7f3e96' }  ",
            "}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');

        const formatter = new Formatter();
        formatter.Options.MaxTotalLineLength = 120;
        formatter.Options.JsonEolStyle = EolStyle.Lf;
        formatter.Options.NumberListAlignment = NumberListAlignment.Decimal;
        formatter.Options.TableCommaPlacement = TableCommaPlacement.BeforePadding;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // In this case, the commas should be right next to values.
        expect(outputLines.length).toBe(5);
        expect(outputLines[1]).toContain('"steady",');
        expect(outputLines[2]).toContain('"pulse",');
        expect(outputLines[3]).toContain('"gradient",');

        expect(outputLines[1]).toContain('-44,');
        expect(outputLines[2]).toContain('22,');
    });

    test("Commas after padding works", () => {
        const inputLines = [
            "{",
            "    'Rect' : { 'glow': 'steady', 'position': {'x': -44, 'y':  4}, 'color': [0, 255, 255] }, ",
            "    'Point': { 'glow': 'pulse', 'position': {'y': 22, 'z': 3} }, ",
            "    'Oval' : { 'glow': 'gradient', 'position': {'x': 140.33, 'y':  0.1}, 'color': '#7f3e96' }  ",
            "}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');

        const formatter = new Formatter();
        formatter.Options.MaxTotalLineLength = 120;
        formatter.Options.JsonEolStyle = EolStyle.Lf;
        formatter.Options.NumberListAlignment = NumberListAlignment.Decimal;
        formatter.Options.TableCommaPlacement = TableCommaPlacement.AfterPadding;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // In this case, many values will have spaces after them.
        expect(outputLines.length).toBe(5);
        expect(outputLines[1]).toContain('"steady" ');
        expect(outputLines[2]).toContain('"pulse" ');
        expect(outputLines[3]).toContain('"gradient" ');

        expect(outputLines[1]).toContain('-44 ');
        expect(outputLines[2]).toContain('22 ');
        expect(outputLines[3]).toContain('140.33,');

        // And the first set of commas should line up.
        expect(DoInstancesLineUp(outputLines, ",")).toBeTruthy();
    });

    test("Commas before padding except numbers works", () => {
        const inputLines = [
            "{",
            "    'Rect' : { 'glow': 'steady', 'position': {'x': -44, 'y':  4}, 'color': [0, 255, 255] }, ",
            "    'Point': { 'glow': 'pulse', 'position': {'y': 22, 'z': 3} }, ",
            "    'Oval' : { 'glow': 'gradient', 'position': {'x': 140.33, 'y':  0.1}, 'color': '#7f3e96' }  ",
            "}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');

        const formatter = new Formatter();
        formatter.Options.MaxTotalLineLength = 120;
        formatter.Options.JsonEolStyle = EolStyle.Lf;
        formatter.Options.NumberListAlignment = NumberListAlignment.Decimal;
        formatter.Options.TableCommaPlacement = TableCommaPlacement.AfterPadding;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // For strings, the commas should be right next to values.
        expect(outputLines.length).toBe(5);
        expect(outputLines[1]).toContain('"steady",');
        expect(outputLines[2]).toContain('"pulse",');
        expect(outputLines[3]).toContain('"gradient",');

        // For numbers, many will have space after.
        expect(outputLines[1]).toContain('-44 ');
        expect(outputLines[2]).toContain('22 ');
        expect(outputLines[3]).toContain('140.33,');

        // And the commas should line up before the "y" column.
        expect(DoInstancesLineUp(outputLines, ', "y":')).toBeTruthy();
    });

    test("Commas before padding works with comments", () => {
        const input = `
            [
                [ 1 /* q */, "a" ], /* w */
                [ 22, "bbb" ], // x
                [ 3.33 /* sss */, "cc" ] /* y */
            ]
        `;

        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.MaxTotalLineLength = 40;
        formatter.Options.JsonEolStyle = EolStyle.Lf;
        formatter.Options.NumberListAlignment = NumberListAlignment.Decimal;
        formatter.Options.TableCommaPlacement = TableCommaPlacement.BeforePadding;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // The commas should come immediately after the 22, and after the first comments on the other lines.
        expect(outputLines.length).toBe(5);
        expect(outputLines[1]).toContain('*/,');
        expect(outputLines[2]).toContain('22,');
        expect(outputLines[3]).toContain('*/,');

        // The outer commas and comments should line up.
        expect(outputLines[1].indexOf("],")).toBe(outputLines[2].indexOf("],"));
        expect(outputLines[1].indexOf("/* w")).toBe(outputLines[2].indexOf("// x"));
        expect(outputLines[2].indexOf("// x")).toBe(outputLines[3].indexOf("/* y"));
    });

    test("Commas after padding works with comments", () => {
        const input = `
            [
                [ 1 /* q */, "a" ], /* w */
                [ 22, "bbb" ], // x
                [ 3.33 /* sss */, "cc" ] /* y */
            ]
        `;

        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.MaxTotalLineLength = 40;
        formatter.Options.JsonEolStyle = EolStyle.Lf;
        formatter.Options.NumberListAlignment = NumberListAlignment.Decimal;
        formatter.Options.TableCommaPlacement = TableCommaPlacement.AfterPadding;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // The first row of commas should be in a line after room for all comments.
        expect(DoInstancesLineUp(outputLines, ',')).toBeTruthy();

        // The outer commas and comments should line up.
        expect(outputLines[1].indexOf("],")).toBe(outputLines[2].indexOf("],"));
        expect(outputLines[1].indexOf("/* w")).toBe(outputLines[2].indexOf("// x"));
        expect(outputLines[2].indexOf("// x")).toBe(outputLines[3].indexOf("/* y"));
    });
});
