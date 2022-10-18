import {readdirSync, readFileSync} from "fs";
import {FracturedJsonOptions} from "../src/FracturedJsonOptions";
import {CommentPolicy} from "../src/CommentPolicy";
import {Formatter} from "../src/Formatter";

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
    test.each(GenerateUniversalParams())("Is well formed", (params) => {
        const formatter = new Formatter();
        formatter.Options = params.Opts;

        // For this test we can't have comments present.
        if (formatter.Options.CommentPolicy == CommentPolicy.Preserve)
            formatter.Options.CommentPolicy = CommentPolicy.Remove;

        const outputText = formatter.Reformat(params.Text, 0);

        JSON.parse(outputText);
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
/*
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
*/
    return optsList;
}
