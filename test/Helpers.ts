/**
 * Number of distinct columns at which any of seekStrings occur.  Lines with no match are ignored.
 * Returns 0 if none of the strings appear.  Returns 1 if every match shares one column.
 */
export function CountDistinctColumns(lines: string[], ...seekStrings: string[]): number {
    const indices = new Set<number>();
    for (const seek of seekStrings) {
        for (const line of lines) {
            const idx = line.indexOf(seek);
            if (idx >= 0)
                indices.add(idx);
        }
    }
    return indices.size;
}

/**
 * Tests that occurrences of the given substrings share one column.
 * A single substring that never appears counts as lined up.  Several substrings must all appear,
 * and at that same column.
 */
export function DoInstancesLineUp(lines: string[], ...seekStrings: string[]): boolean {
    const count = CountDistinctColumns(lines, ...seekStrings);
    if (seekStrings.length <= 1)
        return count <= 1;
    return count === 1;
}
