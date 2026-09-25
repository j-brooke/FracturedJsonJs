import {CommentPolicy, EolStyle, Formatter, FracturedJsonOptions} from "../src";

describe("Collapse opening brackets", () => {
    test("Collapse if prop name is short enough", () => {
        const output = reformat(testJson, commonOptions());
        const outputLines = output.trimEnd().split("\n");

        expect(outputLines.length).toBe(18);

        // The "q" and the /*t*/ get collapsed since their containers' bracket lines are short enough that they
        // can start at the same position as they normally would.
        expect(outputLines[0]).toBe('{     "q": [/*t*/ [');

        // Likewise, the first [ inside the "r" array can be collapsed.  It just barely fits.
        expect(outputLines[6].startsWith('      "r": [[      1,')).toBeTruthy();

        // The first [ inside the "ss" array is not collapsed - the prop name, colon, and bracket are 7 wide, so there's
        // no room.
        expect(outputLines[11]).toBe('      "ss": [');
    });

    test("Prop name padding affects decision", () => {
        const options = commonOptions();
        options.MaxPropNamePadding = 20;
        const output = reformat(testJson, options);
        const outputLines = output.trimEnd().split("\n");

        expect(outputLines.length).toBe(20);

        // The /*t*/ can't follow the "q", since prop name padding is making the prop name, colon, and bracket take
        // too much space.
        expect(outputLines[0]).toBe('{     "q" : [');
    });

    test("Tabs prevent collapse", () => {
        const options = commonOptions();
        options.UseTabToIndent = true;
        const output = reformat(testJson, options);
        const outputLines = output.trimEnd().split("\n");

        // Despite some lines having room for a collapse, tabs prevent it.
        expect(outputLines.length).toBe(23);
    });
});

function commonOptions(): FracturedJsonOptions {
    const options = new FracturedJsonOptions();
    options.IndentSpaces = 6;
    options.CollapseOpeningBrackets = true;
    options.MaxTotalLineLength = 80;
    options.MaxPropNamePadding = 0;
    options.CommentPolicy = CommentPolicy.Preserve;
    options.NestedBracketPadding = false;
    options.JsonEolStyle = EolStyle.Lf;
    return options;
}

const testJson = `
{
    "q" : [
        /*t*/ [
             1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17,
            18, 19, 20
        ],
        [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
    ],
    "r" : [
        [
             1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17,
            18, 19, 20
        ],
        [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
    ],
    "ss": [
        [
             1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17,
            18, 19, 20
        ],
        [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
    ]
}
`;

function reformat(input: string, options: FracturedJsonOptions): string {
    const formatter = new Formatter();
    formatter.Options = options;
    return formatter.Reformat(input, 0);
}
