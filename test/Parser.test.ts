import {Parser} from "../src/Parser";
import {JsonItemType} from "../src/JsonItemType";
import {FracturedJsonOptions} from "../src";
import {CommentPolicy} from "../src";


describe("Parser Tests", () => {
    test("Test simple and valid array", () => {
        const input = "[4.7, true, null, \"a string\", {}, false, []]";
        const parser = new Parser();
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Type).toBe(JsonItemType.Array);

        const expectedChildTypes = [JsonItemType.Number, JsonItemType.True, JsonItemType.Null, JsonItemType.String,
            JsonItemType.Object, JsonItemType.False, JsonItemType.Array];
        const foundChildTypes = docModel[0].Children.map(ch => ch.Type);
        expect(expectedChildTypes).toEqual(foundChildTypes);

        const expectedText = [ "4.7", "true", "null", "\"a string\"", "", "false", ""];
        const foundText = docModel[0].Children.map(ch => ch.Value);
        expect(expectedText).toEqual(foundText);
    });

    test("Array with inline block comments", () => {
        const input = "[ /*a*/ 1 /*b*/ ]";

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(1);
        expect(docModel[0].Children[0].PrefixComment).toBe("/*a*/");
        expect(docModel[0].Children[0].PostfixComment).toBe("/*b*/");
    });

    test("Array with mixed inline comments", () => {
        const inputSegments = [
            "[ /*a*/ 1 //b",
            "]",
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(1);
        expect(docModel[0].Children[0].PrefixComment).toBe("/*a*/");
        expect(docModel[0].Children[0].PostfixComment).toBe("//b");
    });

    test("Array with unattached trailing comments", () => {
        const inputSegments = [
            "[ /*a*/ 1 /*b*/ /*c*/",
            "]",
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(2);
        expect(docModel[0].Children[0].Type).toBe(JsonItemType.Number);
        expect(docModel[0].Children[0].PrefixComment).toBe("/*a*/");
        expect(docModel[0].Children[0].PostfixComment).toBe("/*b*/");
        expect(docModel[0].Children[1].Type).toBe(JsonItemType.BlockComment);
        expect(docModel[0].Children[1].Value).toBe("/*c*/");
    });

    test("Array with multiple leading comments", () => {
        const input = "[ /*a*/ /*b*/ 1 ]";

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(2);
        expect(docModel[0].Children[0].Type).toBe(JsonItemType.BlockComment);
        expect(docModel[0].Children[0].Value).toBe("/*a*/");
        expect(docModel[0].Children[1].Type).toBe(JsonItemType.Number);
        expect(docModel[0].Children[1].PrefixComment).toBe("/*b*/");
    });

    test("Array ambiguous comment precedes comma", () => {
        const input = "[ /*a*/ 1 /*b*/, 2 /*c*/ ]";

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(2);
        expect(docModel[0].Children[0].PrefixComment).toBe("/*a*/");
        expect(docModel[0].Children[0].PostfixComment).toBe("/*b*/");
        expect(docModel[0].Children[1].PrefixCommentLength).toBe(0);
        expect(docModel[0].Children[1].PostfixComment).toBe("/*c*/");
    });

    test("Array ambiguous comment follows comma", () => {
        const input = "[ /*a*/ 1, /*b*/ 2 /*c*/ ]";

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(2);
        expect(docModel[0].Children[0].PrefixComment).toBe("/*a*/");
        expect(docModel[0].Children[0].PostfixCommentLength).toBe(0);
        expect(docModel[0].Children[1].PrefixComment).toBe("/*b*/");
        expect(docModel[0].Children[1].PostfixComment).toBe("/*c*/");
    });

    test("Array ambiguous comment follows comma with newline", () => {
        const inputSegments = [
            "[ /*a*/ 1, /*b*/",
            "2 /*c*/ ]",
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(2);
        expect(docModel[0].Children[0].PrefixComment).toBe("/*a*/");
        expect(docModel[0].Children[0].PostfixComment).toBe("/*b*/");
        expect(docModel[0].Children[1].PrefixCommentLength).toBe(0);
        expect(docModel[0].Children[1].PostfixComment).toBe("/*c*/");
    });

    test("Array multiple unattached comments", () => {
        const inputSegments = [
            "[",
            "    /*a*/ //b",
            "    null",
            "]",
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(3);
        expect(docModel[0].Children[0].Value).toBe("/*a*/");
        expect(docModel[0].Children[1].Value).toBe("//b");
        expect(docModel[0].Children[2].Type).toBe(JsonItemType.Null);
    });

    test("Array multiple comment stands alone", () => {
        const inputSegments = [
            "[",
            "    1, /*a",
            "    b*/ 2",
            "]",
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(3);
        expect(docModel[0].Children[0].Value).toBe("1");
        expect(docModel[0].Children[1].Value).toBe("/*a\r\n    b*/");
        expect(docModel[0].Children[2].Value).toBe("2");
    });

    test("Array blank lines are preserved or removed", () => {
        const inputSegments = [
            "[",
            "",
            "    //comment",
            "    true,",
            "",
            "    ",
            "    false",
            "]",
        ];
        const input = inputSegments.join("\r\n");

        const preserveOptions = new FracturedJsonOptions();
        preserveOptions.CommentPolicy = CommentPolicy.Preserve;
        preserveOptions.AllowTrailingCommas = true;
        preserveOptions.PreserveBlankLines = true;

        const preserveParser = new Parser();
        preserveParser.Options = preserveOptions;
        const preserveDocModel = preserveParser.ParseTopLevel(input, false);

        expect(preserveDocModel.length).toBe(1);
        expect(preserveDocModel[0].Type).toBe(JsonItemType.Array);
        const preserveExpectedTypes = [JsonItemType.BlankLine, JsonItemType.LineComment, JsonItemType.True,
            JsonItemType.BlankLine, JsonItemType.BlankLine, JsonItemType.False];
        const preserveFoundTypes = preserveDocModel[0].Children.map(ch => ch.Type);
        expect(preserveExpectedTypes).toEqual(preserveFoundTypes);

        // Now turn that stuff off
        const removeOptions = new FracturedJsonOptions();
        removeOptions.CommentPolicy = CommentPolicy.Remove;
        removeOptions.AllowTrailingCommas = true;
        removeOptions.PreserveBlankLines = false;

        const removeParser = new Parser();
        removeParser.Options = removeOptions;
        const removeDocModel = removeParser.ParseTopLevel(input, false);

        expect(removeDocModel.length).toBe(1);
        expect(removeDocModel[0].Type).toBe(JsonItemType.Array);
        const removeExpectedTypes = [JsonItemType.True, JsonItemType.False];
        const removeFoundTypes = removeDocModel[0].Children.map(ch => ch.Type);
        expect(removeExpectedTypes).toEqual(removeFoundTypes);
    });

    test("Test simple and valid object", () => {
        const input = "{ \"a\": 5.2, \"b\": false, \"c\": null, \"d\": true, \"e\":[], \"f\":{}, \"g\": \"a string\" }";
        const parser = new Parser();
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Type).toBe(JsonItemType.Object);

        const expectedChildTypes = [JsonItemType.Number, JsonItemType.False, JsonItemType.Null, JsonItemType.True,
            JsonItemType.Array, JsonItemType.Object, JsonItemType.String];
        const foundChildTypes = docModel[0].Children.map(ch => ch.Type);
        expect(expectedChildTypes).toEqual(foundChildTypes);

        const expectedPropNames = ["\"a\"", "\"b\"", "\"c\"", "\"d\"", "\"e\"", "\"f\"", "\"g\""];
        const foundPropNames = docModel[0].Children.map(ch => ch.Name);
        expect(expectedPropNames).toEqual(foundPropNames)

        const expectedText = [ "5.2", "false", "null", "true", "", "",  "\"a string\""];
        const foundText = docModel[0].Children.map(ch => ch.Value);
        expect(expectedText).toEqual(foundText);
    });

    test("Object blank lines are preserved or removed", () => {
        const inputSegments = [
            "{",
            "",
            "    //comment",
            "    \"w\": true,",
            "",
            "    ",
            "    \"x\": false",
            "}",
        ];
        const input = inputSegments.join("\r\n");

        const preserveOptions = new FracturedJsonOptions();
        preserveOptions.CommentPolicy = CommentPolicy.Preserve;
        preserveOptions.AllowTrailingCommas = true;
        preserveOptions.PreserveBlankLines = true;

        const preserveParser = new Parser();
        preserveParser.Options = preserveOptions;
        const preserveDocModel = preserveParser.ParseTopLevel(input, false);

        expect(preserveDocModel.length).toBe(1);
        expect(preserveDocModel[0].Type).toBe(JsonItemType.Object);
        const preserveExpectedTypes = [ JsonItemType.BlankLine, JsonItemType.LineComment, JsonItemType.True,
            JsonItemType.BlankLine, JsonItemType.BlankLine, JsonItemType.False];
        const preserveFoundTypes = preserveDocModel[0].Children.map(ch => ch.Type);
        expect(preserveExpectedTypes).toEqual(preserveFoundTypes);

        // Now turn that stuff off
        const removeOptions = new FracturedJsonOptions();
        removeOptions.CommentPolicy = CommentPolicy.Remove;
        removeOptions.AllowTrailingCommas = true;
        removeOptions.PreserveBlankLines = false;

        const removeParser = new Parser();
        removeParser.Options = removeOptions;
        const removeDocModel = removeParser.ParseTopLevel(input, false);

        expect(removeDocModel.length).toBe(1);
        expect(removeDocModel[0].Type).toBe(JsonItemType.Object);
        const removeExpectedTypes = [JsonItemType.True, JsonItemType.False];
        const removeFoundTypes = removeDocModel[0].Children.map(ch => ch.Type);
        expect(removeExpectedTypes).toEqual(removeFoundTypes);
    });

    test("Object with inline block comments", () => {
        // An object containing a single element, with comments that should be attached to it in all 3 positions.
        const input = "{ /*a*/ \"w\": /*b*/ 1 /*c*/ }";

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(1);
        expect(docModel[0].Children[0].PrefixComment).toBe("/*a*/");
        expect(docModel[0].Children[0].MiddleComment).toBe("/*b*/");
        expect(docModel[0].Children[0].PostfixComment).toBe("/*c*/");
    });

    test("Object middle comments combined 1", () => {
        // If there's more than one comment between a property name and value, we just merge them.  I suspect this will
        // never actually happen outside of unit tests.
        const inputSegments = [
            "{",
            "    \"w\" /*a*/ : //b",
            "        10.9,",
            "}"
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(1);
        expect(docModel[0].Children[0].PrefixCommentLength).toBe(0);
        expect(docModel[0].Children[0].MiddleComment).toBe("/*a*/\n//b\n");
        expect(docModel[0].Children[0].PostfixCommentLength).toBe(0);
    });

    test("Object middle comments combined 2", () => {
        // If there's more than one comment between a property name and value, we just merge them.  I suspect this will
        // never actually happen outside of unit tests.
        const inputSegments = [
            "{",
            "    \"w\" /*a*/ :",
            "    /*b*/ 10.9,",
            "}"
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(1);
        expect(docModel[0].Children[0].PrefixCommentLength).toBe(0);
        expect(docModel[0].Children[0].MiddleComment).toBe("/*a*/\n/*b*/");
        expect(docModel[0].Children[0].PostfixCommentLength).toBe(0);
    });

    test("Object middle comments combined 3", () => {
        // In this case we've got a line-ending comment and then a block comment, both between the property name
        // and its value.  Totally, totally plausible!  In this case, Parser squashes them into a single middle comment,
        // but with a newline in there.
        const inputSegments = [
            "{",
            "    \"w\": //a",
            "    /*b*/ 10.9,",
            "}"
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(1);
        expect(docModel[0].Children[0].PrefixCommentLength).toBe(0);
        expect(docModel[0].Children[0].MiddleComment).toBe("//a\n/*b*/");
        expect(docModel[0].Children[0].PostfixCommentLength).toBe(0);
    });

    test("Object Comments Prefer Same Line Elements", () => {
        const inputSegments = [
            "{",
            "          \"w\": 1, /*a*/",
            "    /*b*/ \"x\": 2, /*c*/",
            "          \"y\": 3,  /*d*/",
            "          \"z\": 4",
            "}"
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(4);
        expect(docModel[0].Children[0].PrefixCommentLength).toBe(0);
        expect(docModel[0].Children[0].PostfixComment).toBe("/*a*/");
        expect(docModel[0].Children[1].PrefixComment).toBe("/*b*/");
        expect(docModel[0].Children[1].PostfixComment).toBe("/*c*/");
        expect(docModel[0].Children[2].PrefixCommentLength).toBe(0);
        expect(docModel[0].Children[2].PostfixComment).toBe("/*d*/");
    });

    test("Object with inline block comments 2", () => {
        // Here, comment a should be postfix-attached to x:2.
        const input = "{  \"w\": 1, /*a*/ \"x\": 2 }";

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(2);
        expect(docModel[0].Children[1].PrefixComment).toBe("/*a*/");
    });

    test("Object with inline block comments 3", () => {
        // Here, we want comment a to be post-fixed to "w":1 and b to be prefixed to "x":2.
        const input = "{  \"w\": 1, /*a*/ /*b*/ \"x\": 2 }";

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(2);

        expect(docModel[0].Children[0].Name).toBe("\"w\"");
        expect(docModel[0].Children[0].Type).toBe(JsonItemType.Number);
        expect(docModel[0].Children[0].PostfixComment).toBe("/*a*/");

        expect(docModel[0].Children[1].Name).toBe("\"x\"");
        expect(docModel[0].Children[1].Type).toBe(JsonItemType.Number);
        expect(docModel[0].Children[1].PrefixComment).toBe("/*b*/");
    });

    test("Array Comments for Multiline Element", () => {
        // Comments that should be attached to a multi-line array.
        const inputSegments = [
            "[",
            "    /*a*/ [",
            "        1, 2, 3",
            "    ] //b",
            "]"
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(1);
        expect(docModel[0].Children[0].PrefixComment).toBe("/*a*/");
        expect(docModel[0].Children[0].PostfixComment).toBe("//b");
    });

    test("Object Comments for Multiline Element", () => {
        // Comments that should be attached to a multi-line array.
        const inputSegments = [
            "{",
            "    /*a*/ \"w\": [",
            "        1, 2, 3",
            "    ] //b",
            "}"
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Children.length).toBe(1);
        expect(docModel[0].Children[0].PrefixComment).toBe("/*a*/");
        expect(docModel[0].Children[0].PostfixComment).toBe("//b");
    });


    test("Complexity work", () => {
        const inputSegments = [
            "[",
            "    null,",
            "    [ 1, 2, 3 ],",
            "    [ 1, 2, {}],",
            "    [ 1, 2, { /*a*/ }],",
            "    [ 1, 2, { \"w\": 1 }]",
            "]"
        ];
        const input = inputSegments.join("\r\n");

        const options = new FracturedJsonOptions();
        options.CommentPolicy = CommentPolicy.Preserve;
        options.AllowTrailingCommas = true;
        options.PreserveBlankLines = true;

        const parser = new Parser();
        parser.Options = options;
        const docModel = parser.ParseTopLevel(input, false);

        expect(docModel.length).toBe(1);
        expect(docModel[0].Complexity).toBe(3);
        expect(docModel[0].Children.length).toBe(5);

        // Primitive elements always have a complexity of 0.
        expect(docModel[0].Children[0].Complexity).toBe(0);

        // An array/object always has a complexity 1 greater than the greatest of its child element complexities.
        expect(docModel[0].Children[1].Complexity).toBe(1);

        // An empty array/object has a complexity of 0, so this is treated the same as the case above.
        expect(docModel[0].Children[2].Complexity).toBe(1);
        expect(docModel[0].Children[2].Children[2].Complexity).toBe(0);

        // Comments don't count when determining an object/array's complexity, so this is the same as above.
        expect(docModel[0].Children[3].Complexity).toBe(1);
        expect(docModel[0].Children[3].Children[2].Complexity).toBe(0);

        // Here there's a non-empty object nested in the array, so it's more complex.
        expect(docModel[0].Children[4].Complexity).toBe(2);
        expect(docModel[0].Children[4].Children[2].Complexity).toBe(1);
    });

    test.each([
        ["[,1]"],
        ["[1 2]"],
        ["[1, 2,]"],
        ["[1, 2}"],
        ["[1, 2"],
        ["[1, /*a*/ 2]"],
        ["[1, //a\n 2]"],
        ["{, \"w\":1 }"],
        ["{ \"w\":1 "],
        ["{ /*a*/ \"w\":1 }"],
        ["{ \"w\":1, }"],
        ["{ \"w\":1 ]"],
        ["{ \"w\"::1 "],
        ["{ \"w\" \"foo\" }"],
        ["{ \"w\" {:1 }"],
        ["{ \"w\":1 \"x\":2 }"],
    ])("Throws for malformed data", (input) => {
        const parser = new Parser();
        expect(() => parser.ParseTopLevel(input, false)).toThrow();
    });

    test("Stops after first element", () => {
        const input = "[ 1, 2 ],[ 3, 4 ]";

        const parser = new Parser();

        expect(() => parser.ParseTopLevel(input, true)).toThrowError();
    });
});

