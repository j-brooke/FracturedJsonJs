/**
 * Tests that the first occurence of the substring occurs at the same index in each line, if the line contains it.
 */
export function DoInstancesLineUp(lines: string[], substring: string): boolean {
    const indices = lines.map(str => str.indexOf(substring))
        .filter(num => num >= 0);
    return indices.length==0 || indices.every(num => num == indices[0]);
}
