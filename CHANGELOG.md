# FracturedJsonJs Change Log

## 4.0.2

### Bug Fixes

* Fixed a [bug](https://github.com/j-brooke/FracturedJsonJs/issues/13) involving an exception serializing data containing a sparse array.

## 4.0.1

### Bug Fixes 

* Fixed a [bug](https://github.com/j-brooke/FracturedJson/issues/32) where no exception is thrown when there's a property name but no value at the end of an object.
* Fixed a [bug](https://github.com/j-brooke/FracturedJson/issues/31) where object contents with `toJSON` methods were missing their property names, results in invalid JSON.

## 4.0.0

### Features

Replaced setting `DontJustifyNumbers` with a new enum, `NumberListAlignment`, to control how arrays or table columns of numbers are handled.

* `Normalize` is the default and it behaves like previous versions when `DontJustifyNumbers==false`.  With it, number lists or columns are rewritten with the same number of digits after the decimal place.
* `Decimal` lines the numbers up according to their decimal points, preserving the number exactly as it appeared in the input document.  For regular numbers this usually looks like `Normalize`, except with spaces padding out the extra decimal places instead of zeros.
* `Left` lines up the values on the left, preserving the exactly values from the input document.
* `Right` lines up the values on the right, preserving the exactly values from the input document.

### Added

New setting, `NumberListAlignment`.

### Removed

Removed setting `DontJustifyNumbers`.


## 3.1.1

### Bug Fixes

* Fixed a [bug](https://github.com/j-brooke/FracturedJson/issues/27) where numbers that overflow or underflow a 64-bit float could (depending on settings) be written to the output as `Infinity` or `0`.  In the overflow case, that caused output to be invalid JSON.  With this fix, FracturedJson recognizes that it can't safely reform numbers like this, and uses the exact number representation from the original document.


## 3.1.0

### Added

* New setting: `OmitTrailingWhitespace`.  When true, the output JSON won't have any trailing spaces or tabs.  This is probably the preferred behavior in most cases, but the default is `false` for backward compatibility.


## 3.0.0

### Features

* Support for comments (sometimes called JSON-with-comments or .jsonc).  Where possible, comments stay stuck to the elements that they're closest to in the input.
* Deep table formatting.  In version 2, only the immediate children of table rows were lined up.  Now, if space permits and the types are consistent, all descendents are aligned as table columns.
* New length limit option: `MaxTotalLineLength`.
* Option to preserve blank lines.
* Option to allow trailing commas.

### Added

* New settings: `MaxTotalLineLength`, `MaxTableRowComplexity`, `MinCompactArrayRowItems`, `CommentPolicy`, `PreserveBlankLines`, `AllowTrailingCommas`.

### Removed

* Removed settings: `TableObjectMinimumSimilarity`, `TableArrayMinimumSimilarity`, `AlignExpandedPropertyNames`, `JsonSerializerOptions`.
* Support for East Asian Full-width characters is no longer built-in.  I did this to eliminate coupling with any specific library.  You can easily recreate the functionality by providing your own `StringLengthFunc`.  (See the `EastAsianWideCharacters.test` test file for an example.)

### Changed

* All of the settings are now bundled in a single class, `FracturedJsonOptions`.  They are now set all at once to `Formatter.Options` rather than being separate properties of `Formatter`.
* Method names have changed.  Use `Reformat` when you're providing JSON text, or `Serialize` when providing JavaScript values.


## 2.2.1

### Bug Fixes

Fixed https://github.com/j-brooke/FracturedJsonJs/issues/5 - an exception was being thrown when the input data contained `undefined`.  This is only relevant to the JavaScript version.  In fixing this I tried to mimic the behavior of `JSON.stringify()`, and succeeded in two out of three cases:

* If an array contains `undefined`, `null` is used instead.
* If an object property's value is `undefined`, the property is skipped.  (Property names can't be `undefined`.)
* If `undefined` is passed as the root value to `JSON.stringify()`, the return value is `undefined`.  As of this version, FracturedJsonJs' `serialize()` will return the string `null`.  To make it behave like `stringify` in this case would have required changing the TypeScript signature, which would require a major version increase.

## 2.2.0

### Added

* New property `stringWidthFunc` determines how many spaces are used as padding to line up columns when formatted as a table.
    * Static method `Formatter.StringWidthWithEastAsian` (default) uses two spaces for East Asian "fullwidth" symbols, and one space for others.
    * Static method `Formatter.StringWidthByCharacterCount` treats each character as having the width of one space.
* New property `simpleBracketPadding` controls whether brackets should have spaces inside when they contain only simple elements.  (The old property `NestedBracketPadding` is used when they contain other arrays/objects.)

## 2.0.1

### Bug Fixes

* Escape sequences in property names are not preserved (#2)

## 2.0.0

Re-written to support table-formatting.  When an expanded array or object is composed of highly similar inline arrays or objects, FracturedJson tries to format them in a tabular format, sorting properties and justifying values to make everything line up neatly.

The module structure has changed and several things renamed to behave in a more standard way.

### Added

* TypeScript support
* New properties `indentSpaces` and `useTabToIndent` to control indentation.
* New properties `tableObjectMinimumSimilarity` and `tableArrayMinimumSimilarity` control how alike inline sibling elements need to be to be formatted as a table.
* New property `alignExpandedPropertyNames` to line up expanded object property names even when not treated as a table.
* New property `dontJustifyNumbers` prevents numbers from being right-justified and set to matching precision.

### Removed

* `JustifyNumberLists` property has been removed.  The new table formatting covers this functionality better.
* `IndentString` property has been removed.  `indentSpaces` and `useTabToIndent` are used to control indentation instead.  The flexibility intended for `IndentString` turned out not to be worth the confusion.

### Changed

* Property names and methods now begin with lowercase letters.
