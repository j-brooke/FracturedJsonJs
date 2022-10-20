// @ts-ignore
import * as eaw from 'eastasianwidth';
import {Formatter} from "../src";
// @ts-ignore
import {DoInstancesLineUp} from "./Helpers";

describe("East Asian wide character tests", function () {
    test("Pads wide chars correctly", () => {
        const inputLines = [
            "[",
            "    {'Name': '李小龍', 'Job': 'Actor', 'Born': 1940},",
            "    {'Name': 'Mark Twain', 'Job': 'Writer', 'Born': 1835},",
            "    {'Name': '孫子', 'Job': 'General', 'Born': -544}",
            "]"
        ];
        const input = inputLines.join("\n").replace(/'/g, '"');
        const formatter = new Formatter();

        let output = formatter.Reformat(input, 0);
        let outputLines = output.trimEnd().split('\n');

        // With the default StringLengthFunc, all characters are treated as having the same width as space, so
        // String.IndexOf should give the same number for each row.
        expect(DoInstancesLineUp(outputLines, "Job")).toBeTruthy();
        expect(DoInstancesLineUp(outputLines, "Born")).toBeTruthy();

        formatter.StringLengthFunc = WideCharStringLength;
        output = formatter.Reformat(input, 0);
        outputLines = output.trimEnd().split('\n');

        // In using the WideCharStringLength function, the Asian characters are each treated as 2 spaces wide.
        // Whether these line up visually for you depends on your font and the rendering policies of your app.
        // (It looks right on a Mac terminal.)
        expect(outputLines[1].indexOf("Job")).toBe(25);
        expect(outputLines[2].indexOf("Job")).toBe(28);
        expect(outputLines[3].indexOf("Job")).toBe(26);
    });
});


function WideCharStringLength(str: string): number {
    return eaw.length(str);
}
