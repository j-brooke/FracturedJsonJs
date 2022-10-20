import {Formatter} from "../src";
import {CommentPolicy} from "../src";
// @ts-ignore
import {DoInstancesLineUp} from "./Helpers";

describe("Comment formatting tests", () => {
    test("Pre and Post comments stay with elems", () => {
        const inputLines = [
            "{",
            "    /*1*/ 'a': [true, true], /*2*/",
            "    'b': [false, false], ",
            "    /*3*/ 'c': [false, true] /*4*/",
            "}"
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.MaxInlineComplexity = 2;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // With these options, they should all be written on one line.
        expect(outputLines.length).toBe(1);

        formatter.Options.MaxInlineComplexity = 1;
        output = formatter.Reformat(input, 0);
        outputLines = output.trimEnd().split('\n');

        // With MaxInlineComplexity=1, the output should be much like the input (except with a little padding).
        // Importantly, the comment 2 should stay with the 'a' line, and comment 3 should be with 'c'.
        expect(outputLines.length).toBe(5);
        expect(outputLines[1]).toContain('"a"');
        expect(outputLines[1]).toContain('/*2*/');
        expect(outputLines[3]).toContain('"c"');
        expect(outputLines[3]).toContain('/*3*/');

        // With no inlining possible, every subarray element gets its own line.  But the comments before the property
        // names and after the array-ending brackets need to stick to those things.
        formatter.Options.MaxInlineComplexity = 0;
        formatter.Options.MaxCompactArrayComplexity = 0;
        formatter.Options.MaxTableRowComplexity = 0;

        output = formatter.Reformat(input, 0);
        outputLines = output.trimEnd().split('\n');

        expect(outputLines.length).toBe(14);
        expect(outputLines[1]).toContain('/*1*/ "a"');
        expect(outputLines[4]).toContain('] /*2*/,');
        expect(outputLines[9]).toContain('/*3*/ "c"');
        expect(outputLines[12]).toContain('] /*4*/');
    });


    test("Blank lines force expanded", () => {
        const inputLines = [
            "    [ 1,",
            "    ",
            "    2 ]",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // By default, blank lines are ignored like any other whitespace, so this whole thing gets inlined.
        expect(outputLines.length).toBe(1);

        formatter.Options.PreserveBlankLines = true;
        output = formatter.Reformat(input, 0);
        outputLines = output.trimEnd().split('\n');

        // If we're preserving blank lines, the array has to be written as expanded, so 1 line for each element,
        // 1 for the blank line, and 1 each for [].
        expect(outputLines.length).toBe(5);
    });

    test("Can inline middle comments if no line break", () => {
        const inputLines = [
            "{'a': /*1*/",
            "[true,true]}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // There's a comment between the property name and the prop value, but it doesn't require line breaks,
        // so the whole thing can be written inline.
        expect(outputLines.length).toBe(1);
        expect(outputLines[0]).toContain("/*1*/");

        // If we disallow inlining, it'll be handled as a compact multiline array.
        formatter.Options.MaxInlineComplexity = 0;
        output = formatter.Reformat(input, 0);
        outputLines = output.trimEnd().split('\n');

        expect(outputLines[1]).toContain('"a": /*1*/ [');
    });

    test("Split when middle comment requires break 1", () => {
        const inputLines = [
            "{'a': //1",
            "[true,true]}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // Since there's a comment that requires a line break between the property name and its value, the
        // comment gets put on a new line with an extra indent level, and the value is written as expanded,
        // also with the extra indent level
        expect(outputLines.length).toBe(8);
        expect(outputLines[1].indexOf('"a"')).toBe(4);
        expect(outputLines[2].indexOf('//1')).toBe(8);
        expect(outputLines[3].indexOf('[')).toBe(8);
    });

    test("Split when middle comment requires break 2", () => {
        const inputLines = [
            "{'a': /*1",
            "2*/ [true,true]}",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // Since there's a comment that requires a line break between the property name and its value, the
        // comment gets put on a new line with an extra indent level, and the value is written as expanded,
        // also with the extra indent level
        expect(outputLines.length).toBe(9);
        expect(outputLines[1].indexOf('"a"')).toBe(4);
        expect(outputLines[2].indexOf('/*1')).toBe(8);
        expect(outputLines[4].indexOf('[')).toBe(8);
    });

    test("Multiline comments preserve relative spacing", () => {
        const inputLines = [
            "[ 1,",
            "  /* +",
            "     +",
            "     + */",
            "  2]",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // The +'s should stay lined up in the output.
        expect(outputLines.length).toBe(7);
        expect(DoInstancesLineUp(outputLines, "+")).toBeTruthy();
    });

    test("Ambiguous comments in arrays respect commas", () => {
        const inputLines = [
            "[ [ 'a' /*1*/, 'b' ],",
            "  [ 'c', /*2*/ 'd' ] ]",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.AlwaysExpandDepth = 99;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // We split all of the elements onto separate lines, but the comments should stay with them.  The comment
        // should stick to the element that's on the same side of the comma.
        expect(outputLines.length).toBe(10);
        expect(output).toContain('"a" /*1*/,');
        expect(output).toContain('/*2*/ "d"');
    });

    test("Ambiguous comments in objects respect commas", () => {
        const inputLines = [
            "[ { 'a':'a' /*1*/, 'b':'b' },",
            "  { 'c':'c', /*2*/ 'd':'d'} ]",
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.AlwaysExpandDepth = 99;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // We split all of the elements onto separate lines, but the comments should stay with them.  The comment
        // should stick to the element that's on the same side of the comma.
        expect(outputLines.length).toBe(10);
        expect(output).toContain('"a" /*1*/,');
        expect(output).toContain('/*2*/ "d"');
    });

    test("Top level comments ignored if set", () => {
        const inputLines = [
            "//a",
            "[1,2, //b",
            "3]",
            "//c"
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Remove;
        formatter.Options.AlwaysExpandDepth = 99;

        let output = formatter.Reformat(input, 0);

        expect(output.length).not.toContain("//");
    });
});
