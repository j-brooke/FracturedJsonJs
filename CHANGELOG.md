# FracturedJsonJs Change Log

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
* Method names have changed.  Use `Reformat` when you're providing a JSON text, or `Serialize` when providing JavaScript values.


## 2.2.1

### Bug Fixes

Fixed https://github.com/j-brooke/FracturedJsonJs/issues/5 - an exception was being thrown when the input data contained `undefined`.  This is only relevant to the JavaScript version.  In fixing this I tried to mimic the behavior of `JSON.stringify()`, and succeded in two out of three cases:

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
