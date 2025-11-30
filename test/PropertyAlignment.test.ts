import {CommentPolicy, Formatter} from "../src";
// @ts-ignore
import {DoInstancesLineUp} from "./Helpers";

describe("Property Alignment Tests", () => {
    test("Prop values aligned", () => {
        const input = `
            {
                "num": 14,
                "string": "testing property alignment",
                "arrayWithLongName": [null, null, null]
            }
        `;

        const formatter = new Formatter();
        formatter.Options.MaxPropNamePadding = 15;
        formatter.Options.ColonBeforePropNamePadding = false;
        formatter.Options.MaxInlineComplexity = -1;
        formatter.Options.MaxCompactArrayComplexity = -1;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // This object should be expanded with the property values and colons aligned.  The array should be expanded
        // as well.
        expect(outputLines.length).toBe(9);
        expect(DoInstancesLineUp(outputLines, ':')).toBeTruthy();
    });

    test("Prop values aligned but not colons", () => {
        const input = `
            {
                "num": 14,
                "string": "testing property alignment",
                "arrayWithLongName": [null, null, null]
            }
        `;

        const formatter = new Formatter();
        formatter.Options.MaxPropNamePadding = 15;
        formatter.Options.ColonBeforePropNamePadding = true;
        formatter.Options.MaxInlineComplexity = -1;
        formatter.Options.MaxCompactArrayComplexity = -1;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // This object should be expanded with the property values, but the colons should hug the prop names instead
        // of being aligned.
        expect(outputLines.length).toBe(9);
        expect(outputLines[1]).toContain('"num":');
        expect(outputLines[2]).toContain('"string":');
        expect(outputLines[3]).toContain('"arrayWithLongName":');
        expect(outputLines[1].indexOf("14")).toBe(outputLines[2].indexOf('"testing'));
        expect(outputLines[1].indexOf("14")).toBe(outputLines[3].indexOf('['));
    });

    test("Don't align prop vals when too much padding required", () => {
        const input = `
            {
                "num": 14,
                "string": "testing property alignment",
                "arrayWithLongName": [null, null, null]
            }
        `;

        const formatter = new Formatter();
        formatter.Options.MaxPropNamePadding = 12;
        formatter.Options.ColonBeforePropNamePadding = false;
        formatter.Options.MaxInlineComplexity = -1;
        formatter.Options.MaxCompactArrayComplexity = -1;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // This object should be expanded with the property values, but the colons should hug the prop names instead
        // of being aligned.
        expect(outputLines.length).toBe(9);
        expect(outputLines[1]).toContain('"num": 14');
        expect(outputLines[2]).toContain('"string": "testing');
        expect(outputLines[3]).toContain('"arrayWithLongName": [');
    });

    test("Don't align prop vals when multiline comment", () => {
        const input = `
            {
                "foo": // this is foo
                    [1, 2, 4],
                "bar": null,
                "bazzzz": /* this is baz */ [0]
            }
        `;

        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.ColonBeforePropNamePadding = false;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // Since there's a comment with a line break between a prop label and value, we shouldn't even try to align
        // property values here.
        expect(outputLines.length).toBe(11);
        expect(outputLines[9].indexOf(':')).not.toBe(outputLines[8].indexOf(':'));
    });

    test("Align prop vals when simple comment", () => {
        const input = `
            {
                "foo": // this is foo
                    [1, 2, 4],
                "bar": null,
                "bazzzz": /* this is baz */ [0]
            }
        `;

        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.ColonBeforePropNamePadding = false;
        formatter.Options.MaxTotalLineLength = 80;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // This object should be expanded with the property values and colons aligned.  The array should be expanded
        // as well.
        expect(outputLines.length).toBe(5);
        expect(DoInstancesLineUp(outputLines, '[')).toBeTruthy();
    });

    test("Align prop vals when array wraps", () => {
        const input = `
            {
                "foo": /* this is foo */
                    [1, 2, 4],
                "bar": null,
                "bazzzz": /* this is baz */ [0]
            }
        `;

        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.ColonBeforePropNamePadding = false;
        formatter.Options.MaxTotalLineLength = 38;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // This object should be expanded with the property values and colons aligned.  The array should be expanded
        // as well.
        expect(outputLines.length).toBe(7);
        expect(DoInstancesLineUp(outputLines, '[')).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, ':')).toBeTruthy();
    });

    test("Don't align when simple value too long", () => {
        const input = `
            {
                "foo": /* this is foo */
                    [1, 2, 4],
                "bar": null,
                "bazzzz": /* this is baz */ [0]
            }
        `;

        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        formatter.Options.ColonBeforePropNamePadding = false;
        formatter.Options.MaxTotalLineLength = 36;

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // If we tried to align the properties here, bar's null would exceed the line length due to the padding.
        // FJ should give up on aligning properties in that case.
        expect(outputLines.length).toBe(7);
        expect(output).toContain('"bar":');
        expect(outputLines[1].indexOf(':')).not.toBe(outputLines[5].indexOf(':'));
    });
});
