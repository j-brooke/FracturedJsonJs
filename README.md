# FracturedJsonJs
JSON formatter that produces human-readable but fairly compact output.

This `npm` module is part of a family of FracturedJson tools.
* [Home page and Browser-based Formatter](https://j-brooke.github.io/FracturedJson/)
* [FracturedJsonJs GitHub Page](https://github.com/j-brooke/FracturedJsonJs)
* [FracturedJson GitHub Page](https://github.com/j-brooke/FracturedJson)
* [FracturedJson Wiki](https://github.com/j-brooke/FracturedJson/wiki)
* [npm Package](https://www.npmjs.com/package/fracturedjsonjs)
* [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=j-brooke.fracturedjsonvsc)

## Example

Here's a sample of output using nearly-default settings:

```json
{
    "SimpleArray": [
        2,   3,   5,   7,  11,  13,  17,  19,  23,  29,  31,  37,  41,  43,  47,  53,
        59,  61,  67,  71,  73,  79,  83,  89,  97, 101, 103, 107, 109, 113
    ],
    "ObjectColumnsArrayRows": {
        "Katherine": ["blue"      , "lightblue", "black"       ],
        "Logan"    : ["yellow"    , "blue"     , "black", "red"],
        "Erik"     : ["red"       , "purple"                   ],
        "Jean"     : ["lightgreen", "yellow"   , "black"       ]
    },
    "ArrayColumnsObjectRows": [
        { "type": "turret"   , "hp": 400, "loc": {"x": 47, "y":  -4}, "flags": "S"   },
        { "type": "assassin" , "hp":  80, "loc": {"x": 12, "y":   6}, "flags": "Q"   },
        { "type": "berserker", "hp": 150, "loc": {"x":  0, "y":   0}                 },
        { "type": "pittrap"  ,            "loc": {"x": 10, "y": -14}, "flags": "S,I" }
    ],
    "ComplexArray": [
        [19,  2],
        [ 3,  8],
        [14,  0],
        [ 9,  9],
        [ 9,  9],
        [ 0,  3],
        [10,  1],
        [ 9,  1],
        [ 9,  2],
        [ 6, 13],
        [18,  5],
        [ 4, 11],
        [12,  2]
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
      254 /*00FE*/,  1450 /*5AA*/ ,     0 /*0000*/, 36000 /*8CA0*/,    10 /*000A*/, 
      199 /*00C7*/, 15001 /*3A99*/,  6540 /*198C*/
  ], 
  /* Elements are keen */
  "Elements": [
    { /*Carbon*/   "Symbol": "C" , "Number":  6, "Isotopes": [11, 12, 13, 14] }, 
    { /*Oxygen*/   "Symbol": "O" , "Number":  8, "Isotopes": [16, 18, 17    ] }, 
    { /*Hydrogen*/ "Symbol": "H" , "Number":  1, "Isotopes": [ 1,  2,  3    ] }, 
    { /*Iron*/     "Symbol": "Fe", "Number": 26, "Isotopes": [56, 54, 57, 58] }  
    // Not a complete list...
  ], 

  "Beatles Songs": [
    "Taxman"        ,  // George
    "Hey Jude"      ,  // Paul  
    "Act Naturally" ,  // Ringo 
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
const { Formatter, CommentPolicy, FracturedJsonOptions, EolStyle } = require('fracturedjsonjs');

// For examples of the options, see
// https://github.com/j-brooke/FracturedJson/wiki/Options
const options = new FracturedJsonOptions();
options.MaxTotalLineLength = 80;
options.MaxInlineComplexity = 1;
options.JsonEolStyle = EolStyle.Crlf;

const formatter = new Formatter();
formatter.Options = options;

// Use Serialize to go from JavaScript data to JSON text.
const inputObj = [[1, 2, 3], [4, 16, 64]];
const textFromObj = formatter.Serialize(inputObj);

console.log("From inputObj:");
console.log(textFromObj);

// Comments aren't allowed by default, but they're easy to enable.
formatter.Options.CommentPolicy = CommentPolicy.Preserve;
formatter.Options.IndentSpaces = 2;

// Use Reformat to go from JSON text to JSON text.
const inputText = '{ "a": [1, 2, 3] /* <a */, "b": [null, 5] /* <b */ }';
const textFromText = formatter.Reformat(inputText);

console.log("From inputText:");
console.log(textFromText);
```
