import * as fs from "fs";
import * as path from "path";
import {
    CommentPolicy,
    EolStyle,
    Formatter,
    FracturedJsonOptions,
    NumberListAlignment,
    TableCommaPlacement,
} from "../src";

const goldenRoot = path.join(__dirname, "Golden");

interface ManifestCase {
    id: string;
    input: string;
    expected: string;
    operation?: string;
    startingDepth?: number;
    options?: Record<string, unknown>;
}

interface ManifestFile {
    suiteVersion: number;
    familyVersion: string;
    generatedFrom?: string;
    defaultsProfile?: string;
    defaultsFile: string;
    forced?: Record<string, unknown>;
    cases: ManifestCase[];
}

const optionEnums: Record<string, Record<string, number | string>> = {
    JsonEolStyle: EolStyle as unknown as Record<string, number | string>,
    CommentPolicy: CommentPolicy as unknown as Record<string, number | string>,
    NumberListAlignment: NumberListAlignment as unknown as Record<string, number | string>,
    TableCommaPlacement: TableCommaPlacement as unknown as Record<string, number | string>,
};

function loadJson<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function applyPatch(options: FracturedJsonOptions, patch: Record<string, unknown> | undefined, label: string): void {
    if (!patch)
        return;

    for (const [key, value] of Object.entries(patch)) {
        if (!(key in options))
            throw new Error(`${label}: unknown option '${key}'`);

        const enumType = optionEnums[key];
        if (enumType) {
            if (typeof value !== "string" || typeof enumType[value] !== "number")
                throw new Error(`${label}: '${key}' must be an enum identifier string (got ${JSON.stringify(value)})`);
            (options as unknown as Record<string, unknown>)[key] = enumType[value];
            continue;
        }

        const current = (options as unknown as Record<string, unknown>)[key];
        if (typeof current !== typeof value)
            throw new Error(`${label}: '${key}' has type ${typeof value}, expected ${typeof current}`);
        (options as unknown as Record<string, unknown>)[key] = value;
    }
}

function buildOptions(defaults: Record<string, unknown>, golden: ManifestCase, forced?: Record<string, unknown>): FracturedJsonOptions {
    const options = new FracturedJsonOptions();
    applyPatch(options, defaults, `${golden.id} defaults`);
    applyPatch(options, golden.options, golden.id);
    applyPatch(options, forced, `${golden.id} forced`);
    return options;
}

function splitKeepEmpty(text: string): string[] {
    return text.split("\n");
}

function showLine(index: number, lines: string[]): string {
    if (index >= lines.length)
        return "<missing line>";
    return lines[index].replace(/ /g, "·");
}

function describeMismatch(caseId: string, expected: string, actual: string): string {
    const expLines = splitKeepEmpty(expected);
    const actLines = splitKeepEmpty(actual);
    const lineCount = Math.max(expLines.length, actLines.length);
    let firstDiff = -1;
    for (let i = 0; i < lineCount; ++i) {
        const expLine = i < expLines.length ? expLines[i] : "<missing line>";
        const actLine = i < actLines.length ? actLines[i] : "<missing line>";
        if (expLine !== actLine) {
            firstDiff = i;
            break;
        }
    }

    const lines = [
        `Golden output differed for ${caseId}.`,
        "JS does not regenerate goldens. Fix the formatter or sync from C# after a C# update.",
    ];
    if (firstDiff >= 0) {
        lines.push(`First difference at line ${firstDiff + 1}:`);
        lines.push(`  expected: ${showLine(firstDiff, expLines)}`);
        lines.push(`  actual:   ${showLine(firstDiff, actLines)}`);
    }
    return lines.join("\n");
}

const manifestPath = path.join(goldenRoot, "manifest.json");
if (!fs.existsSync(manifestPath)) {
    throw new Error(
        `Missing ${manifestPath}. From a sibling FracturedJson checkout run scripts/sync-conformance.sh`);
}

const manifest = loadJson<ManifestFile>(manifestPath);
if (manifest.suiteVersion !== 1)
    throw new Error(`Unsupported golden suiteVersion: ${manifest.suiteVersion}`);
if (!manifest.cases || manifest.cases.length === 0)
    throw new Error("Golden manifest has no cases");

const duplicateIds = Object.entries(
    manifest.cases.reduce<Record<string, number>>((acc, c) => {
        acc[c.id] = (acc[c.id] ?? 0) + 1;
        return acc;
    }, {}))
    .filter(([, n]) => n > 1)
    .map(([id]) => id);
if (duplicateIds.length > 0)
    throw new Error("Duplicate golden case ids: " + duplicateIds.join(", "));

const defaults = loadJson<Record<string, unknown>>(path.join(goldenRoot, manifest.defaultsFile));

if (process.env["FRACTUREDJSON_UPDATE_GOLDENS"] === "1")
    console.warn("FRACTUREDJSON_UPDATE_GOLDENS is set; JS does not regenerate goldens.");


describe("FracturedJson 5.0 conformance", () => {
    for (const golden of manifest.cases) {
        test(golden.id, () => {
            const inputPath = path.join(goldenRoot, golden.input);
            const expectedPath = path.join(goldenRoot, golden.expected);
            if (!fs.existsSync(inputPath))
                throw new Error(`Missing golden input: ${inputPath}`);
            if (!fs.existsSync(expectedPath))
                throw new Error(`Missing golden expected file: ${expectedPath}`);

            const options = buildOptions(defaults, golden, manifest.forced);
            const formatter = new Formatter();
            formatter.Options = options;

            const input = fs.readFileSync(inputPath, "utf8");
            const operation = golden.operation ?? "reformat";
            if (operation !== "reformat" && operation !== "minify")
                throw new Error(`${golden.id}: operation must be reformat or minify`);

            const actual = operation === "minify"
                ? formatter.Minify(input)
                : formatter.Reformat(input, golden.startingDepth ?? 0);
            const expected = fs.readFileSync(expectedPath, "utf8");

            if (actual !== expected)
                throw new Error(describeMismatch(golden.id, expected, actual));
        });
    }
});
