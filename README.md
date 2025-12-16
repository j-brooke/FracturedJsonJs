# FracturedJsonJs

FracturedJson is a family of utilities that format [JSON data](https://www.json.org) in a way that's easy for
humans to read, but fairly compact.  Arrays and objects are written on single lines, as long as they're
neither too long nor too complex.  When several such lines are similar in structure, they're written with
fields aligned like a table.  Long arrays are written with multiple items per line across multiple lines.

This `npm` module is part of a family of FracturedJson tools.
* [Home page and Browser-based Formatter](https://j-brooke.github.io/FracturedJson/)
* [FracturedJsonJs GitHub Page](https://github.com/j-brooke/FracturedJsonJs)
* [FracturedJson GitHub Page](https://github.com/j-brooke/FracturedJson)
* [FracturedJson Wiki](https://github.com/j-brooke/FracturedJson/wiki)
* [npm Package](https://www.npmjs.com/package/fracturedjsonjs)
* [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=j-brooke.fracturedjsonvsc)

## Example

Here's a sample of output using nearly default settings. (`MaxTotalLineLength=100`)
```json
{
    "BasicObject"   : {
        "ModuleId"   : "armor",
        "Name"       : "",
        "Locations"  : [
            [11,  2], [11,  3], [11,  4], [11,  5], [11,  6], [11,  7], [11,  8], [11,  9],
            [11, 10], [11, 11], [11, 12], [11, 13], [11, 14], [ 1, 14], [ 1, 13], [ 1, 12],
            [ 1, 11], [ 1, 10], [ 1,  9], [ 1,  8], [ 1,  7], [ 1,  6], [ 1,  5], [ 1,  4],
            [ 1,  3], [ 1,  2], [ 4,  2], [ 5,  2], [ 6,  2], [ 7,  2], [ 8,  2], [ 8,  3],
            [ 7,  3], [ 6,  3], [ 5,  3], [ 4,  3], [ 0,  4], [ 0,  5], [ 0,  6], [ 0,  7],
            [ 0,  8], [12,  8], [12,  7], [12,  6], [12,  5], [12,  4]
        ],
        "Orientation": "Fore",
        "Seed"       : 272691529
    },
    "SimilarArrays" : {
        "Katherine": ["blue",       "lightblue", "black"       ],
        "Logan"    : ["yellow",     "blue",      "black", "red"],
        "Erik"     : ["red",        "purple"                   ],
        "Jean"     : ["lightgreen", "yellow",    "black"       ]
    },
    "SimilarObjects": [
        { "type": "turret",    "hp": 400, "loc": {"x": 47, "y":  -4}, "flags": "S"   },
        { "type": "assassin",  "hp":  80, "loc": {"x": 12, "y":   6}, "flags": "Q"   },
        { "type": "berserker", "hp": 150, "loc": {"x":  0, "y":   0}                 },
        { "type": "pittrap",              "loc": {"x": 10, "y": -14}, "flags": "S,I" }
    ]
}
```

If enabled in the settings, it can also handle JSON-with-comments (which isn't real JSON).

```jsonc
{
    /*
     * Multi-line comments
     * are fun!
     */
    "NumbersWithHex": [
          254 /*00FE*/,  1450 /*5AA*/,      0 /*0000*/, 36000 /*8CA0*/,    10 /*000A*/,
          199 /*00C7*/, 15001 /*3A99*/,  6540 /*198C*/
    ],
    /* Elements are keen */
    "Elements"      : [
        { /*Carbon*/   "Symbol": "C",  "Number":  6, "Isotopes": [11, 12, 13, 14] },
        { /*Oxygen*/   "Symbol": "O",  "Number":  8, "Isotopes": [16, 18, 17    ] },
        { /*Hydrogen*/ "Symbol": "H",  "Number":  1, "Isotopes": [ 1,  2,  3    ] },
        { /*Iron*/     "Symbol": "Fe", "Number": 26, "Isotopes": [56, 54, 57, 58] }
        // Not a complete list...
    ],

    "Beatles Songs" : [
        "Taxman",          // George
        "Hey Jude",        // Paul
        "Act Naturally",   // Ringo
        "Ticket To Ride"   // John
    ]
}
```

## Install

```sh
npm i fracturedjsonjs
```

## Usage

```js
import {
    Formatter,
    FracturedJsonOptions,
    CommentPolicy,
    EolStyle,
    NumberListAlignment,
    TableCommaPlacement,
} from 'fracturedjsonjs';

// The constructor below will give default behavior that is consistent across minor version
// changes.  But if you don't care about backward compatibility and just want the newest best
// settings whatever they are, use this instead:
//   const options = FracturedJsonOptions.Recommended();
const options = new FracturedJsonOptions();

// For examples of the options, see:
//   https://github.com/j-brooke/FracturedJson/wiki/Options
// Or experiment interactively with the web formatter:
//   https://j-brooke.github.io/FracturedJson/
options.MaxTotalLineLength = 80;
options.MaxInlineComplexity = 1;
options.JsonEolStyle = EolStyle.Crlf;
options.NumberListAlignment = NumberListAlignment.Decimal;
options.TableCommaPlacement = TableCommaPlacement.BeforePadding;

const formatter = new Formatter();
formatter.Options = options;

// Use Serialize to go from JavaScript data to JSON text.
const inputObj = [
    { val: 123.456 },
    { val: 234567.8 },
    { val: 3 },
    { val: null },
    { val: 5.67890123 }
];

const textFromObj = formatter.Serialize(inputObj);

console.log("From inputObj:");
console.log(textFromObj);

// Comments aren't allowed by default, but they're easy to enable.
formatter.Options.CommentPolicy = CommentPolicy.Preserve;
formatter.Options.IndentSpaces = 2;

// Use Reformat to go from JSON text to JSON text.
const inputText = '[{"a":123.456,"b":0,"c":0},{"a":234567.8,"b":0,"c":0},'
    + '{"a":3,"b":0.00000,"c":7e2},{"a":null,"b":2e-1,"c":80e1},{"a":5.6789,"b":3.5e-1,"c":0}]';
const textFromText = formatter.Reformat(inputText);

console.log("From inputText:");
console.log(textFromText);
```
