import {readdirSync, readFileSync} from "fs";
import {FracturedJsonOptions} from "../src/FracturedJsonOptions";
import {CommentPolicy} from "../src/CommentPolicy";
import {Formatter} from "../src/Formatter";
import {EolStyle} from "../out/EolStyle";

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

        const outputText = formatter.Reformat(params.Text, 0);

        JSON.parse(outputText);
    });

    // Any string that exists in the input should exist somewhere in the output.
    test.each(GenerateUniversalParams())("All strings exist", (params) => {
        const formatter = new Formatter();
        formatter.Options = params.Opts;
        const outputText = formatter.Reformat(params.Text, 0);

        let startPos = 0;
        while (true) {
            while (startPos < params.Text.length && params.Text[startPos] != '"')
                startPos += 1;

            let endPos = startPos + 1;
            while (endPos < params.Text.length && params.Text[endPos] != '"')
                endPos += 1;

            if (endPos >= params.Text.length)
                return;

            const stringFromSource = params.Text.substring(startPos+1, endPos - startPos - 2);
            expect(params.Text).toContain(stringFromSource);

            startPos = endPos + 1;
        }
    });

    // Makes sure that the length restriction properties are respected.
    test.each(GenerateUniversalParams())("Max length respected", (params) => {
        const formatter = new Formatter();
        formatter.Options = params.Opts;
        const outputText = formatter.Reformat(params.Text, 0);
        const outputLines = outputText.trimEnd().split(EolString(params.Opts));

        for (const line of outputLines) {
            const content = SkipPrefixAndIndent(params.Opts, line);

            // If the content is shorter than the max, it's all good.
            if (content.length <= params.Opts.MaxInlineLength && line.length <= params.Opts.MaxTotalLineLength)
                continue;

            // We'll consider it a single element if there's no more than one comma.
            const commaCount = content.replace(/[^,]/g, "").length;
            expect(commaCount).toBeLessThanOrEqual(1);
        }
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