/*
 * The edits `pnpm setup:product` makes, as functions from text to text. They find their place by
 * the structure of each file, never by the placeholder wording, so running the setup again changes
 * the same lines and a value can be corrected later.
 */

export type ProductInput = {
  name: string;
  description: string;
  audience: string;
  tone: string;
  surfaces: string;
};

const PLACEHOLDER = "TO FILL IN";
// The catalog ships with a sample name and description; they count as not yet answered.
const SAMPLE_NAME = "Meu produto";
const SAMPLE_DESCRIPTION_START = "Descreva aqui";
const MAX_NAME = 60;
const MAX_DESCRIPTION = 200;
const EM_DASH = "—";

/** What is wrong with the answers, as readable lines. Empty means they can be written. */
export function validateProduct(input: ProductInput): string[] {
  const problems: string[] = [];
  const checks: ReadonlyArray<readonly [keyof ProductInput, string]> = [
    ["name", "name"],
    ["description", "description"],
    ["audience", "audience"],
    ["tone", "tone"],
    ["surfaces", "surfaces"],
  ];
  for (const [key, label] of checks) {
    const value = input[key].trim();
    if (value === "" || value.includes(PLACEHOLDER)) {
      problems.push(`${label} is required`);
    }
    if (value.includes(EM_DASH)) {
      problems.push(`${label} must not contain an em dash, use a comma, a period or a hyphen`);
    }
  }
  if (input.name.trim().length > MAX_NAME) {
    problems.push(`name must be at most ${MAX_NAME} characters`);
  }
  if (input.description.trim().length > MAX_DESCRIPTION) {
    problems.push(`description must be at most ${MAX_DESCRIPTION} characters`);
  }
  return problems;
}

const diacritics = /[̀-ͯ]/g;
const notAlphanumeric = /[^a-z0-9]+/g;
const edgeDashes = /^-+|-+$/g;

/** An npm package name from a product name: "Meu Produto" becomes "meu-produto". */
export function packageSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(diacritics, "")
    .toLowerCase()
    .replace(notAlphanumeric, "-")
    .replace(edgeDashes, "");
  return slug === "" ? "product" : slug;
}

const finalPeriods = /\.+$/;
const withoutFinalPeriod = (text: string) => text.trim().replace(finalPeriods, "");

export function applyCatalog(json: string, input: ProductInput): string {
  const catalog = JSON.parse(json) as { site: { name: string; description: string } };
  catalog.site.name = input.name.trim();
  catalog.site.description = input.description.trim();
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export function applyPackage(json: string, input: ProductInput): string {
  const manifest = JSON.parse(json) as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(manifest)) {
    next[key] = key === "name" ? packageSlug(input.name) : value;
    // The description sits right after the name, in the order npm shows it.
    if (key === "name") {
      next["description"] = input.description.trim();
    }
  }
  return `${JSON.stringify(next, null, 2)}\n`;
}

export function applyReadme(markdown: string, input: ProductInput): string {
  const lines = markdown.split("\n");
  const title = lines.findIndex((line) => line.startsWith("# "));
  if (title < 0) {
    return markdown;
  }
  lines[title] = `# ${input.name.trim()}`;
  const paragraph = lines.findIndex(
    (line, index) => index > title && line.trim() !== "" && !line.startsWith("#"),
  );
  if (paragraph >= 0) {
    lines[paragraph] = input.description.trim();
  }
  return lines.join("\n");
}

const quote = (text: string) => JSON.stringify(text.trim());

export function applyDesign(markdown: string, input: ProductInput, today: string): string {
  const lines = markdown.split("\n");
  const frontmatterEnd = lines.findIndex((line, index) => index > 0 && line === "---");
  const title = lines.findIndex((line, index) => index > frontmatterEnd && line.startsWith("# "));
  const startsWith = (prefix: string) => (line: string) => line.startsWith(prefix);
  const rules: ReadonlyArray<readonly [(line: string) => boolean, string, number, number]> = [
    [startsWith("name: "), `name: ${quote(input.name)}`, 0, frontmatterEnd],
    [startsWith("description: "), `description: ${quote(input.description)}`, 0, frontmatterEnd],
    [startsWith("# "), `# ${input.name.trim()}`, title, title + 1],
    [
      startsWith("- Name: "),
      `- Name: ${withoutFinalPeriod(input.name)}.`,
      frontmatterEnd,
      lines.length,
    ],
    [
      startsWith("- Who it is for: "),
      `- Who it is for: ${withoutFinalPeriod(input.audience)}.`,
      frontmatterEnd,
      lines.length,
    ],
    [
      startsWith("- Tone: "),
      `- Tone: ${withoutFinalPeriod(input.tone)}.`,
      frontmatterEnd,
      lines.length,
    ],
    [
      startsWith("- Surfaces the product uses: "),
      `- Surfaces the product uses: ${withoutFinalPeriod(input.surfaces)}.`,
      frontmatterEnd,
      lines.length,
    ],
    [
      (line) => line.startsWith("| ") && line.includes("| Product created from this base |"),
      `| ${today} | Product created from this base | System inherited unchanged, with the product's color seeds |`,
      frontmatterEnd,
      lines.length,
    ],
  ];
  for (const [matches, replacement, from, to] of rules) {
    const index = lines.findIndex((line, at) => at >= from && at < to && matches(line));
    if (index >= 0) {
      lines[index] = replacement;
    }
  }
  return lines.join("\n");
}

/** The answers already in the files, with the placeholder read as empty, for the prompts' defaults. */
export function readCurrent(catalogJson: string, designMarkdown: string): ProductInput {
  const catalog = JSON.parse(catalogJson) as { site: { name: string; description: string } };
  const field = (label: string) => {
    const line = designMarkdown
      .split("\n")
      .find((candidate) => candidate.startsWith(`- ${label}: `));
    const value = withoutFinalPeriod(line?.slice(label.length + 4) ?? "");
    return value.includes(PLACEHOLDER) ? "" : value;
  };
  return {
    name: catalog.site.name === SAMPLE_NAME ? "" : catalog.site.name,
    description: catalog.site.description.startsWith(SAMPLE_DESCRIPTION_START)
      ? ""
      : catalog.site.description,
    audience: field("Who it is for"),
    tone: field("Tone"),
    surfaces: field("Surfaces the product uses"),
  };
}
