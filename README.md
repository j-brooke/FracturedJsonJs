# FracturedJsonJs
JSON formatter the produces human-readable but fairly compact output.

This is a Javascript port what was originally a .NET library.  For more information, see:
* [FracturedJsonJs GitHub Page](https://github.com/j-brooke/FracturedJsonJs)
* [FracturedJson GitHub Page](https://github.com/j-brooke/FracturedJson)
* [FracturedJson Wiki](https://github.com/j-brooke/FracturedJson/wiki)
* [Browser-based Formatter](https://j-brooke.github.io/FracturedJson/)
* [npm Package](https://www.npmjs.com/package/fracturedjsonjs)


## Install

```sh
npm i fracturedjsonjs
```

## Usage

```js
const FracturedJson = require('fracturedjsonjs')

const obj = {}

const format = new FracturedJson()

// check wiki for options detail
format.MaxInlineLength = 110
format.MaxInlineComplexity = 2
format.MaxCompactArrayComplexity = 2
format.AlwaysExpandDepth = -1
format.NestedBracketPadding = true
format.ColonPadding = true
format.CommaPadding = true
format.JustifyNumberLists = false
format.IndentString = '  '

// stringify
format.Serialize(obj)
```
