import {readdirSync, readFileSync} from "fs";
import {FracturedJsonOptions} from "../src";
import {CommentPolicy} from "../src";
import {Formatter} from "../src";
import {EolStyle} from "../src";

/**
 * Tests that should pass with ANY input and ANY settings, within a few constraints.  These aren't particularly
 * focused tests.  The idea is to throw a variety of inputs with a wide variety of settings and make sure
 * nothing horribly unexpected happens.
 *
 *  Constraints:
 *     * The input is valid JSON
 *     * Input strings may not contain any of []{}:,\n
 *     * Values given to PrefixString" may only contain whitespace.
 *
 * Those rules exist to make the output easy to test without understanding the grammar.  Other files might contain
 * tests that don't impose these restrictions.
 */
describe("Universal Tests", () => {
    // Tests that the output is actually valid JSON.
    test.each(GenerateUniversalParams())("Is well formed", (params) => {
        const formatter = new Formatter();
        formatter.Options = params.Opts;

        // For this test we can't have comments present.
        if (formatter.Options.CommentPolicy == CommentPolicy.Preserve)
            formatter.Options.CommentPolicy = CommentPolicy.Remove;

        const outputText = formatter.Reformat(params.Text);

        JSON.parse(outputText);
    });

    // Any string that exists in the input should exist somewhere in the output.
    test.each(GenerateUniversalParams())("All strings exist", (params) => {
        const formatter = new Formatter();
        formatter.Options = params.Opts;
        const outputText = formatter.Reformat(params.Text);

        let startPos = 0;
        while (true) {
            while (startPos < params.Text.length && params.Text[startPos] != '"')
                startPos += 1;

            let endPos = startPos + 1;
            while (endPos < params.Text.length && params.Text[endPos] != '"')
                endPos += 1;

            if (endPos >= params.Text.length)
                return;

            const stringFromSource = params.Text.substring(startPos+1, endPos);
            expect(outputText).toContain(stringFromSource);

            startPos = endPos + 1;
        }
    });

    // Makes sure that the length restriction properties are respected.
    test.each(GenerateUniversalParams())("Max length respected", (params) => {
        const formatter = new Formatter();
        formatter.Options = params.Opts;
        const outputText = formatter.Reformat(params.Text);
        const outputLines = outputText.trimEnd().split(EolString(params.Opts));

        for (const line of outputLines) {
            const content = SkipPrefixAndIndent(params.Opts, line);

            // If the content is shorter than the max, it's all good.
            if (content.length <= params.Opts.MaxInlineLength && line.length <= params.Opts.MaxTotalLineLength)
                continue;

            // We'll consider it a single element if there's no more than one comma.
            const commaCount = content.match(/,/g)?.length ?? 0;
            expect(commaCount).toBeLessThanOrEqual(1);
        }
    });


    test.each(GenerateUniversalParams())("Max inline complexity respected", (params) => {
        const formatter = new Formatter();
        formatter.Options = params.Opts;
        const outputText = formatter.Reformat(params.Text);
        const outputLines = outputText.trimEnd().split(EolString(params.Opts));

        const generalComplexity = Math.max(params.Opts.MaxInlineLength, params.Opts.MaxCompactArrayComplexity,
            params.Opts.MaxTableRowComplexity);

        // Look at each line of the output separately, counting the nesting level in each.
        for (const line of outputLines) {
            const content = SkipPrefixAndIndent(params.Opts, line);

            // Keep a running total of opens vs closes.  Since Formatter treats empty arrays and objects as complexity
            // zero just like primitives, we don't update nestLevel until we see something other than an empty.
            let openCount = 0;
            let nestLevel = 0;
            let topLevelCommaSeen = false;
            let multipleTopLevelItems = false;
            for (let i = 0; i < content.length; ++i) {
                const ch = content[i];
                switch (ch) {
                    case ' ':
                    case '\t':
                        break;
                    case '[':
                    case '{':
                        multipleTopLevelItems ||= (topLevelCommaSeen && openCount==0);
                        openCount += 1;
                        break;
                    case ']':
                    case '}':
                        openCount -= 1;
                        nestLevel = Math.max(nestLevel, openCount);
                        break;
                    default:
                        multipleTopLevelItems ||= (topLevelCommaSeen && openCount==0);
                        if (ch==',')
                            topLevelCommaSeen ||= (openCount==0);
                        nestLevel = Math.max(nestLevel, openCount);
                        break;
                }
            }

            // If there were multiple top-level items on the line, this must be a compact array case.  Comments mess
            // with the "top level" heuristic though.
            if (multipleTopLevelItems && params.Opts.CommentPolicy != CommentPolicy.Preserve) {
                expect(nestLevel).toBeLessThanOrEqual(params.Opts.MaxCompactArrayComplexity);
                continue;
            }

            // Otherwise, we can't actually tell if it's a compact array, table, or inline by looking at just the one line.
            expect(nestLevel).toBeLessThanOrEqual(generalComplexity);
        }
    });

    test.each(GenerateUniversalParams())("Repeated formatting is stable", (params) => {
        const mainFormatter = new Formatter();
        mainFormatter.Options = params.Opts;
        const initialOutput = mainFormatter.Reformat(params.Text);

        const crunchOutput = mainFormatter.Minify(initialOutput);
        const backToStartOutput1 = mainFormatter.Reformat(crunchOutput);

        // We formatted it, then minified that, then reformatted that.  It should be the same.
        expect(backToStartOutput1).toBe(initialOutput);

        const expandOptions = new FracturedJsonOptions();
        expandOptions.AlwaysExpandDepth = Number.MAX_VALUE;
        expandOptions.CommentPolicy = CommentPolicy.Preserve;
        expandOptions.PreserveBlankLines = true;
        expandOptions.DontJustifyNumbers = true;

        const expandFormatter = new Formatter();
        expandFormatter.Options = expandOptions;

        const expandOutput = expandFormatter.Reformat(crunchOutput);
        const backToStartOutput2 = mainFormatter.Reformat(expandOutput);

        // For good measure, we took the minified output and expanded it as much as possible, and then formatted that.
        // Again, it should be the same as our original formatting.
        expect(backToStartOutput2).toBe(initialOutput);
    });
});


interface IUniversalTestParams {
    Text: string;
    Opts: FracturedJsonOptions;
}

/**
 * Generates combos of input JSON and Formatter options to feed to all of the tests.
 */
function GenerateUniversalParams(): IUniversalTestParams[] {
    const standardBaseDir = "./test/StandardJsonFiles/";
    const standardFileList = readdirSync(standardBaseDir);

    const paramArray: IUniversalTestParams[] = []

    const standardContentList = standardFileList.map(filename => readFileSync(standardBaseDir + filename).toString());
    const standardOptionsList = GenerateOptions();

    for (const fileContents of standardContentList) {
        for (const option of standardOptionsList)
            paramArray.push({ Text: fileContents, Opts: option });
    }

    const commentsBaseDir = "./test/FilesWithComments/";
    const commentsFileList = readdirSync(commentsBaseDir);

    const commentsContentList = commentsFileList.map(filename => readFileSync(commentsBaseDir + filename, {encoding:"utf-8"}).toString());
    const commentsOptionsList = GenerateOptions();
    for (const opts of commentsOptionsList) {
        opts.CommentPolicy = CommentPolicy.Preserve;
        opts.PreserveBlankLines = true;
    }

    for (const fileContents of commentsContentList) {
        for (const option of commentsOptionsList)
            paramArray.push({ Text: fileContents, Opts: option });
    }

    return paramArray;
}

function GenerateOptions(): FracturedJsonOptions[] {
    const optsList: FracturedJsonOptions[] = [];

    let opts = new FracturedJsonOptions();
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxInlineComplexity = 10000;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxInlineLength = Number.MAX_VALUE;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxInlineLength = 23;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxInlineLength = 59;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxTotalLineLength = 59;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.JsonEolStyle = EolStyle.Crlf;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.JsonEolStyle = EolStyle.Lf;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxInlineLength = 0;
    opts.MaxCompactArrayComplexity = 0;
    opts.MaxTableRowComplexity = 0;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxInlineLength = 2;
    opts.MaxCompactArrayComplexity = 0;
    opts.MaxTableRowComplexity = 0;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxInlineLength = 0;
    opts.MaxCompactArrayComplexity = 2;
    opts.MaxTableRowComplexity = 0;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxInlineLength = 0;
    opts.MaxCompactArrayComplexity = 0;
    opts.MaxTableRowComplexity = 2;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.MaxInlineLength = 10;
    opts.MaxCompactArrayComplexity = 10;
    opts.MaxTableRowComplexity = 10;
    opts.MaxTotalLineLength = 1000;
    optsList.push(opts);

    opts = new FracturedJsonOptions();
    opts.NestedBracketPadding = false;
    opts.SimpleBracketPadding = true;
    opts.ColonPadding = false;
    opts.CommentPadding = false;
    opts.IndentSpaces = 3;
    opts.PrefixString = "\t\t";
    optsList.push(opts);

    return optsList;
}

function EolString(options: FracturedJsonOptions) {
    switch (options.JsonEolStyle) {
        case EolStyle.Crlf:
            return "\r\n";
        default:
            return "\n";
    }
}

function SkipPrefixAndIndent(options: FracturedJsonOptions, line: string): string {
    // Skip past the prefix string and whitespace.
    if (line.indexOf(options.PrefixString) != 0)
        throw new Error("Output line does not begin with prefix string");
    return  line.substring(options.PrefixString.length).trimStart();
}