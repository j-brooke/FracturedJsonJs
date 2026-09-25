import {CommentPolicy, EolStyle, Formatter, FracturedJsonOptions} from "../src";

/**
 * Tests for CollapseClosingBrackets: a container's close can share the last child's line when the
 * last item is a real value with no postfix comment and the combined line still fits.
 */
describe("Collapse closing brackets", () => {
    test("Collapses nested expanded brackets", () => {
        const output = reformat("[[1, 2]]", fullyExpanded());
        const lines = linesOf(output);

        expect(lines.length).toBe(4);
        expect(lines[0]).toBe("[");
        expect(lines[1]).toBe("    [");
        expect(lines[2]).toBe("        1,");
        expect(lines[3]).toBe("        2] ]");
    });

    test("Does not collapse when option is off", () => {
        const opts = fullyExpanded();
        opts.CollapseClosingBrackets = false;
        const output = reformat("[[1, 2]]", opts);

        const expected = [
            "[",
            "    [",
            "        1,",
            "        2",
            "    ]",
            "]",
        ].join("\n");
        expect(output.trimEnd()).toBe(expected);
    });

    test("Collapses onto inlined last child", () => {
        const output = reformat('{"a":{"b":[1,2,3]}}', rootExpanded());

        const expected = [
            "{",
            '    "a": { "b": [1, 2, 3] } }',
        ].join("\n");
        expect(output.trimEnd()).toBe(expected);
    });

    test("Collapses compact array close", () => {
        const opts = new FracturedJsonOptions();
        opts.JsonEolStyle = EolStyle.Lf;
        opts.CollapseClosingBrackets = true;
        opts.MaxInlineComplexity = 0;
        opts.MaxCompactArrayComplexity = 1;
        opts.MaxTableRowComplexity = -1;
        opts.MaxTotalLineLength = 20;

        const output = reformat("[1,2,3,4,5,6,7,8,9,10]", opts);
        const lines = linesOf(output);

        expect(lines.length).toBeGreaterThanOrEqual(3);
        expect(lines[0]).toBe("[");
        expect(lines[lines.length - 1].trimEnd().endsWith("]")).toBeTruthy();
        expect(lines[lines.length - 1].trim()).not.toBe("]");
        expect(lines[lines.length - 1]).toContain("10");
    });

    test("Collapses table close", () => {
        const opts = new FracturedJsonOptions();
        opts.JsonEolStyle = EolStyle.Lf;
        opts.CollapseClosingBrackets = true;
        opts.AlwaysExpandDepth = 0;
        opts.MaxInlineComplexity = 1;
        opts.MaxCompactArrayComplexity = 0;

        const output = reformat("[[1, 22],[333, 4]]", opts);
        const expected = [
            "[",
            "    [  1, 22],",
            "    [333,  4]   ]",
        ].join("\n");
        expect(output.trimEnd()).toBe(expected);
    });

    test("Does not collapse onto postfix comment", () => {
        const input = [
            "[",
            "    1,",
            "    2 /* keep */",
            "]",
        ].join("\n");
        const opts = fullyExpanded();
        opts.CommentPolicy = CommentPolicy.Preserve;
        const lines = linesOf(reformat(input, opts));

        expect(lines[lines.length - 1]).toBe("]");
        expect(lines[lines.length - 2]).toContain("/* keep */");
    });

    test("Does not collapse onto standalone comment", () => {
        const input = [
            "[",
            "    1,",
            "    2",
            "    /* trailing */",
            "]",
        ].join("\n");
        const opts = fullyExpanded();
        opts.CommentPolicy = CommentPolicy.Preserve;
        const lines = linesOf(reformat(input, opts));

        expect(lines[lines.length - 1]).toBe("]");
        expect(lines[lines.length - 2]).toContain("/* trailing */");
    });

    test("Does not collapse when line would exceed max", () => {
        const opts = rootExpanded();
        opts.MaxTotalLineLength = 34;
        const output = reformat('{"k": [1, 2, 3, 4, 5, 6, 7, 8]}', opts);

        const expected = [
            "{",
            '    "k": [1, 2, 3, 4, 5, 6, 7, 8]',
            "}",
        ].join("\n");
        expect(output.trimEnd()).toBe(expected);
        for (const line of linesOf(output))
            expect(line.length).toBeLessThanOrEqual(opts.MaxTotalLineLength);
    });

    test("Collapsed lines stay within max total line length", () => {
        const opts = fullyExpanded();
        opts.MaxTotalLineLength = 40;
        const lines = linesOf(reformat("[[[1,2],[3,4]],[[5,6],[7,8]]]", opts));

        expect(lines.some(line => line.includes("]"))).toBeTruthy();
        for (const line of lines)
            expect(line.length).toBeLessThanOrEqual(opts.MaxTotalLineLength);
    });

    test("Collapses onto property aligned last child", () => {
        const input = [
            "{",
            '    "short": 1,',
            '    "longerName": { "x": 1 }',
            "}",
        ].join("\n");
        const opts = new FracturedJsonOptions();
        opts.JsonEolStyle = EolStyle.Lf;
        opts.CollapseClosingBrackets = true;
        opts.AlwaysExpandDepth = 0;
        opts.MaxPropNamePadding = 16;
        opts.MaxTotalLineLength = 80;

        const output = reformat(input, opts);
        const expected = [
            "{",
            '    "short"     : 1,',
            '    "longerName": {"x": 1} }',
        ].join("\n");
        expect(output.trimEnd()).toBe(expected);
    });
});

function fullyExpanded(): FracturedJsonOptions {
    const opts = new FracturedJsonOptions();
    opts.JsonEolStyle = EolStyle.Lf;
    opts.CollapseClosingBrackets = true;
    opts.MaxInlineComplexity = -1;
    opts.MaxCompactArrayComplexity = -1;
    opts.MaxTableRowComplexity = -1;
    return opts;
}

/**
 * Expand only the root so children may still inline.  Table formatting is disabled so the last
 * child goes through FormatItem rather than a table row (which would add dummy-comma padding).
 */
function rootExpanded(): FracturedJsonOptions {
    const opts = new FracturedJsonOptions();
    opts.JsonEolStyle = EolStyle.Lf;
    opts.CollapseClosingBrackets = true;
    opts.AlwaysExpandDepth = 0;
    opts.MaxTableRowComplexity = -1;
    opts.MaxCompactArrayComplexity = -1;
    opts.MaxTotalLineLength = 80;
    return opts;
}

function reformat(input: string, opts: FracturedJsonOptions): string {
    const formatter = new Formatter();
    formatter.Options = opts;
    return formatter.Reformat(input, 0);
}

function linesOf(output: string): string[] {
    return output.trimEnd().split("\n");
}
