import { globSync, readFileSync } from "node:fs";
import process from "node:process";

/*
 * Tailwind silently ignores a class that has no token behind it, so a stock class like
 * `bg-blue-500` would ship as a no-op. This check fails on the stock palette, the stock
 * size, radius and shadow scales, and on colors written by hand outside the token file.
 */

const TOKEN_FILE = "styles/tokens.css";

const STOCK_PALETTE = [
  ...["slate", "gray", "zinc", "neutral", "stone", "mauve", "olive", "mist", "taupe"],
  ...["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan"],
  ...["sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "black", "white"],
].join("|");
const COLOR_UTILITIES = [
  ...["bg", "text", "border(?:-[xytrbse])?", "ring", "ring-offset", "outline", "fill", "stroke"],
  ...["from", "via", "to", "decoration", "accent", "caret", "divide", "placeholder"],
  ...["shadow", "inset-shadow", "drop-shadow", "text-shadow"],
].join("|");

const classRules: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern: new RegExp(
      `(?<![\\w-])(?:${COLOR_UTILITIES})-(?:${STOCK_PALETTE})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`,
      "g",
    ),
    reason: "stock Tailwind color; use a color token from DESIGN.md",
  },
  {
    pattern: /(?<![\w-])-?[a-z-]+-\[(?:#|oklch|oklab|rgb|hsl|hwb|lab|lch|color\()/g,
    reason: "hand-written color value; use a color token from DESIGN.md",
  },
  {
    pattern: /(?<![\w-])rounded(?:-[a-z]{1,2})?(?:-(?:xs|sm|md|lg|xl|[2-4]xl))?(?![\w-])/g,
    reason: "stock radius; use stamp, control, cell, panel, dialog or full",
  },
  {
    pattern: /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g,
    reason: "stock text size; use a typography role from DESIGN.md",
  },
  {
    pattern:
      /(?<![\w-])(?:shadow|inset-shadow|drop-shadow|text-shadow)(?:-(?:2xs|xs|sm|md|lg|xl|2xl|inner))?(?![\w-])/g,
    reason: "stock shadow; only the layer shadow exists",
  },
  {
    pattern: /(?<![\w-])font-serif(?![\w-])/g,
    reason: "no serif face in DESIGN.md",
  },
];

const handWrittenColor = /#[0-9a-fA-F]{3,8}\b|\b(?:oklch|oklab|rgba?|hsla?|hwb|lab|lch)\(/g;

type Finding = { file: string; line: number; match: string; reason: string };

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

type Region = { start: number; text: string };

// Classes only live in string literals (className, cn, cva), so comments and identifiers are never read.
const stringLiteral = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
// In CSS, Tailwind classes only appear after @apply.
const applyLine = /@apply\s+([^;]+);/g;

function regions(text: string, source: RegExp): Region[] {
  return [...text.matchAll(source)].map((match) => ({
    start: match.index + match[0].indexOf(match[2] ?? match[1] ?? ""),
    text: match[2] ?? match[1] ?? "",
  }));
}

function scan(
  file: string,
  text: string,
  scope: Region[],
  rules: ReadonlyArray<{ pattern: RegExp; reason: string }>,
) {
  const findings: Finding[] = [];
  for (const region of scope) {
    for (const { pattern, reason } of rules) {
      for (const match of region.text.matchAll(pattern)) {
        const line = lineOf(text, region.start + match.index);
        findings.push({ file, line, match: match[0], reason });
      }
    }
  }
  return findings;
}

const ignored = (file: string) =>
  file.startsWith("node_modules/") ||
  file.startsWith(".next/") ||
  file === "scripts/check-design-tokens.ts";

// Tests are not interface code: they name namespaces such as "shadow" as plain strings.
const testFile = /\.(?:test|type-test)\.tsx?$/;
const isTest = (file: string) => testFile.test(file);
const sourceFiles = globSync("**/*.{ts,tsx,mts}").filter(
  (file) => !(ignored(file) || isTest(file)),
);
const cssFiles = globSync("**/*.css").filter((file) => !ignored(file) && file !== TOKEN_FILE);

const findings = [
  ...sourceFiles.flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return scan(file, text, regions(text, stringLiteral), classRules);
  }),
  ...cssFiles.flatMap((file) => {
    const text = readFileSync(file, "utf8");
    const whole = [{ start: 0, text }];
    return [
      ...scan(file, text, regions(text, applyLine), classRules),
      ...scan(file, text, whole, [
        { pattern: handWrittenColor, reason: `hand-written color outside ${TOKEN_FILE}` },
      ]),
    ];
  }),
];

for (const { file, line, match, reason } of findings) {
  process.stderr.write(`${file}:${line}  ${match}  ${reason}\n`);
}

if (findings.length > 0) {
  process.stderr.write(`\n${findings.length} design token violation(s).\n`);
  process.exit(1);
}
