/**
 * The data type represented by a TableTemplate, or "Mixed".
 */
export enum TableColumnType {
    /**
     * Initial value.  Not useful by itself.
     */
    Unknown,

    /**
     * Non-container and non-number.  Could be a mix of strings, booleans, nulls, and/or numbers (but not all numbers).
     */
    Simple,

    /**
     * All values in the column are numbers or nulls.
     */
    Number,

    /**
     * All values in the column are arrays or nulls.
     */
    Array,

    /**
     * All values in the column are objects or nulls.
     */
    Object,

    /**
     * Multiple types in the column - for instance, a mix of arrays and strings.
     */
    Mixed,
}