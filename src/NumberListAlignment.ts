/**
 * Options for how lists or columns of numbers should be aligned, and whether the precision may be changed
 * to be consistent.
 */
export enum NumberListAlignment
{
    /**
     * Left-aligns numbers, keeping each exactly as it appears in the input document.
     */
    Left,

    /**
     * Right-aligns numbers, keeping each exactly as it appears in the input document.
     */
    Right,

    /**
     * Arranges the numbers so that the decimal points line up, but keeps each value exactly as it appears in the
     * input document.  Numbers expressed in scientific notation are aligned according to the significand's decimal
     * point, if any, or the "e".
     */
    Decimal,

    /**
     * Tries to rewrite all numbers in the list in regular, non-scientific notation, all with the same number of digits
     * after the decimal point, all lined up.  If any of the numbers have too many digits or can't be written without
     * scientific notation, left-alignment is used as a fallback.
     */
    Normalize,
}