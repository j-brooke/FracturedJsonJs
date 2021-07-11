# FracturedJsonJs Change Log

## 2.0.0

Re-written to support table-formatting.  When an expanded array or object is composed of highly similar inline arrays or objects, FracturedJson tries to format them in a tabular format, sorting properties and justifying values to make everything line up neatly.

The module structure has changed and several things renamed to behave in a more standard way.

### Added

* TypeScript support
* New properties `indentSpaces` and `useTabToIndent` to control indentation.
* New properties `tableObjectMinimumSimilarity` and `tableArrayMinimumSimilarity` control how alike inline sibling elements need to be to be formatted as a table.
* New property `tlignExpandedPropertyNames` to line up expanded object property names even when not treated as a table.
* New property `dontJustifyNumbers` prevents numbers from being right-justified and set to matching precision.

### Removed

* `JustifyNumberLists` property has been removed.  The new table formatting covers this functionality better.
* `IndentString` property has been removed.  `indentSpaces` and `useTabToIndent` are used to control indentation instead.  The flexibility intended for `IndentString` turned out not to be worth the confusion.

### Changed

* Property names and methods now begin with lowercase letters.
