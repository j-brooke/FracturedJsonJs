# FracturedJsonJs
JSON formatter the produces human-readable but fairly compact output.

This is a Javascript port what was originally a .NET library.  For more information, see:
* [Browser-based Formatter](https://j-brooke.github.io/FracturedJson/)
* [FracturedJsonJs GitHub Page](https://github.com/j-brooke/FracturedJsonJs)
* [FracturedJson GitHub Page](https://github.com/j-brooke/FracturedJson)
* [FracturedJson Wiki](https://github.com/j-brooke/FracturedJson/wiki)
* [npm Package](https://www.npmjs.com/package/fracturedjsonjs)
* [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=j-brooke.fracturedjsonvsc)


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
