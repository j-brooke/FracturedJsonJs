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

Here's a sample of output using default settings:

```json
{
    "SimpleArray": [
          2,   3,   5,   7,  11,  13,  17,  19,  23,  29,  31,  37,  41,  43,  47,  53,
         59,  61,  67,  71,  73,  79,  83,  89,  97, 101, 103, 107, 109, 113
    ],
    "ObjectColumnsArrayRows": {
        "Katherine": [ "blue"      , "lightblue", "black"        ],
        "Logan"    : [ "yellow"    , "blue"     , "black", "red" ],
        "Erik"     : [ "red"       , "purple"                    ],
        "Jean"     : [ "lightgreen", "yellow"   , "black"        ]
    },
    "ArrayColumnsObjectRows": [
        { "type": "turret"   , "hp": 400, "loc": {"x": 47, "y": -4} , "flags": "S"   },
        { "type": "assassin" , "hp":  80, "loc": {"x": 12, "y": 6}  , "flags": "Q"   },
        { "type": "berserker", "hp": 150, "loc": {"x": 0, "y": 0}                    },
        { "type": "pittrap"  ,            "loc": {"x": 10, "y": -14}, "flags": "S,I" }
    ],
    "ComplexArray": [
        [ 19,  2 ],
        [  3,  8 ],
        [ 14,  0 ],
        [  9,  9 ],
        [  9,  9 ],
        [  0,  3 ],
        [ 10,  1 ],
        [  9,  1 ],
        [  9,  2 ],
        [  6, 13 ],
        [ 18,  5 ],
        [  4, 11 ],
        [ 12,  2 ]
    ]
}
```


## Install

```sh
npm i fracturedjsonjs
```

## Usage

```js
const { Formatter, EolStyle } = require("fracturedjsonjs");

// If "type" is "module" in your package.json, use import instead.
//import { Formatter, EolStyle } from "fracturedjsonjs";

const jsObj = [[1, 2, 3], [4, 16, 64]];

const formatter = new Formatter();
formatter.maxInlineLength = 110;
formatter.maxInlineComplexity = 1;
formatter.maxCompactArrayComplexity = 1;
formatter.tableObjectMinimumSimilarity = 30;
formatter.tableArrayMinimumSimilarity = 50;
formatter.jsonEolStyle = EolStyle.Crlf;

// See the wiki page for a complete list of settings, with examples.
// Note that unlike the .NET version in the wiki, in JS property names start with lower case.
// https://github.com/j-brooke/FracturedJson/wiki/Options

const jsonString = formatter.serialize(jsObj);
console.log(jsonString);
```
