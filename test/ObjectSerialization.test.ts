import {Formatter} from "../src";
import {readdirSync, readFileSync} from "fs";

// Tests Formatter's Serialize method for writing JSON straight from objects/arrays/strings/etc.
describe("Object serialization tests", () => {
    const simpleTestCases: any[] = [
        null,
        undefined,
        "shoehorn with teeth",
        18,
        [],
        {},
        true,
        "",
        new Date(),                      // Has custom toJSON function
        Symbol.for("xyz"),           // symbol - JSON.stringify returns undefined
        () => 8,                         // function - JSON.stringify returns undefined
        { a: "foo", b: false, c: NaN },  // NaN converts to undefined, so c is omitted
        [[1,2,null], [4,null,6], {x:7,y:8,z:9}],
    ];

    // Serialize.  Then minify.  Then compared to the native minified version.
    test.each(simpleTestCases)("Matches native stringify when minimized", (element:any) => {
        const nativeMinified = JSON.stringify(element);

        const formatter = new Formatter();
        formatter.Options.DontJustifyNumbers = true;
        const nicelyFormatted = formatter.Serialize(element, 0);

        if (!nativeMinified) {
            // There are some cases where JSON.stringify returns undefined.  We should match that.
            expect(nicelyFormatted).toBeUndefined();
        }
        else {
            expect(nicelyFormatted).toBeDefined();

            // No point in comparing the nicely-formatted version to anything native.  But the minified versions
            // should be identical, except maybe for a line ending.
            const fjMinified = formatter.Minify(nicelyFormatted!);
            expect(fjMinified).toBe(nativeMinified);
        }
    });

    test("Throws if circular reference", () => {
        const foo:any[] = [];
        const bar:any[] = [foo];
        foo.push(bar);

        const formatter = new Formatter();
        expect(() => formatter.Serialize(foo)).toThrowError();
    });

    // Serialize.  Then minify.  Then compared to the native minified version.
    test.each(ReadJsonFromFiles())("File data matches native stringify when minimized", (fileData:string) => {
        // Yeah, this is convoluted.  Read the JSON data from files, parse it into objects, then create a minified
        // string form, using the native functions.
        const element = JSON.parse(fileData);
        const nativeMinified = JSON.stringify(element);

        // Use Formatter.Serialize to convert from the object form to nicely formatted JSON text that we can't
        // directly test.  We have to turn off justifying numbers because it can add digits, and we have to turn off
        // table formatting since it can reorder object children.
        const formatter = new Formatter();
        formatter.Options.DontJustifyNumbers = true;
        formatter.Options.MaxTableRowComplexity = -1;
        const nicelyFormatted = formatter.Serialize(element, 0);

        if (!nativeMinified) {
            // There are some cases where JSON.stringify returns undefined.  We should match that.
            expect(nicelyFormatted).toBeUndefined();
        }
        else {
            expect(nicelyFormatted).toBeDefined();

            // Minify the nicely formatted string so we can compare it to the native results.
            const fjMinified = formatter.Minify(nicelyFormatted!);
            expect(fjMinified).toBe(nativeMinified);
        }
    });
});

function ReadJsonFromFiles(): string[] {
    const standardBaseDir = "./test/StandardJsonFiles/";
    const standardFileList = readdirSync(standardBaseDir);

    return standardFileList.map(filename => readFileSync(standardBaseDir + filename).toString());
}
