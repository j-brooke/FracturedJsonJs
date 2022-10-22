import {CommentPolicy, Formatter} from "../src";

describe("Top level items tests", () => {
    test("Error if multiple top level elements", () => {
        const input = "[1,2] [3,4]";

        // There are two top-level element.  It should throw.
        const formatter = new Formatter();
        expect(() => formatter.Reformat(input)).toThrowError();
        expect(() => formatter.Minify(input)).toThrowError();
    });

    test("Error if multiple top level elements with comma", () => {
        const input = "[1,2], [3,4]";

        // There are two top-level element with a comma.  It should throw.
        const formatter = new Formatter();
        expect(() => formatter.Reformat(input)).toThrowError();
        expect(() => formatter.Minify(input)).toThrowError();
    });

    test("Comments after the top level element are preserved", () => {
        const input = "/*a*/ [1,2] /*b*/ //c";

        // There's only one top level element, but there are several comments.
        const formatter = new Formatter();
        formatter.Options.CommentPolicy = CommentPolicy.Preserve;
        const output = formatter.Reformat(input);

        expect(output).toContain("/*a*/");
        expect(output).toContain("/*b*/");
        expect(output).toContain("//c");

        const minifiedOutput = formatter.Reformat(input);

        expect(minifiedOutput).toContain("/*a*/");
        expect(minifiedOutput).toContain("/*b*/");
        expect(minifiedOutput).toContain("//c");
    });
});
