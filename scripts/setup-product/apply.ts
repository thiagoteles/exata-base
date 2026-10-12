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
  /** How many days the daily database backup is kept; the privacy policy promises the same. */
  backupDays: number;
};

const PLACEHOLDER = "TO FILL IN";
// The catalog ships with a sample name and description; they count as not yet answered.
const SAMPLE_NAME = "Meu produto";
const SAMPLE_DESCRIPTION_START = "Descreva aqui";
const MAX_NAME = 60;
const MAX_DESCRIPTION = 200;
const EM_DASH = "—";
const DEFAULT_BACKUP_DAYS = 7;
const MAX_BACKUP_DAYS = 90;

/** What is wrong with the answers, as readable lines. Empty means they can be written. */
export function validateProduct(input: ProductInput): string[] {
  const problems: string[] = [];
  const checks: ReadonlyArray<readonly [Exclude<keyof ProductInput, "backupDays">, string]> = [
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
  if (
    !Number.isInteger(input.backupDays) ||
    input.backupDays < 1 ||
    input.backupDays > MAX_BACKUP_DAYS
  ) {
    problems.push(`backup retention must be a whole number of days from 1 to ${MAX_BACKUP_DAYS}`);
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

/** The site area file: the name and the description a visitor and a search engine read. */
export function applyCatalog(json: string, input: ProductInput): string {
  const site = JSON.parse(json) as { name: string; description: string };
  site.name = input.name.trim();
  site.description = input.description.trim();
  return `${JSON.stringify(site, null, 2)}\n`;
}

const days = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const keptInReadme = /Keep it for (\d+) days?/;
const readmeRetention = /Keep it for \d+ days?/;
const softDelete = /--soft-delete-duration=\d+d/;
const policyKeeping = /guardamos por \d+ dias?/;
const policyLimit = /no máximo \d+ dias? depois/;

/** The backup retention in the README: how long to keep it and the matching soft delete of the bucket. */
export function applyBackupReadme(markdown: string, backupDays: number): string {
  return markdown
    .replace(readmeRetention, `Keep it for ${days(backupDays, "day", "days")}`)
    .replace(softDelete, `--soft-delete-duration=${backupDays}d`);
}

/** The same retention in the privacy policy area file, in the words the person reads. */
export function applyPrivacy(json: string, backupDays: number): string {
  const privacy = JSON.parse(json) as { sections: { backups: { body: string } } };
  const { backups } = privacy.sections;
  backups.body = backups.body
    .replace(policyKeeping, `guardamos por ${days(backupDays, "dia", "dias")}`)
    .replace(policyLimit, `no máximo ${days(backupDays, "dia", "dias")} depois`);
  return `${JSON.stringify(privacy, null, 2)}\n`;
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
export function readCurrent(siteJson: string, designMarkdown: string, readme = ""): ProductInput {
  const site = JSON.parse(siteJson) as { name: string; description: string };
  const field = (label: string) => {
    const line = designMarkdown
      .split("\n")
      .find((candidate) => candidate.startsWith(`- ${label}: `));
    const value = withoutFinalPeriod(line?.slice(label.length + 4) ?? "");
    return value.includes(PLACEHOLDER) ? "" : value;
  };
  const kept = keptInReadme.exec(readme)?.[1];
  return {
    name: site.name === SAMPLE_NAME ? "" : site.name,
    description: site.description.startsWith(SAMPLE_DESCRIPTION_START) ? "" : site.description,
    audience: field("Who it is for"),
    tone: field("Tone"),
    surfaces: field("Surfaces the product uses"),
    backupDays: kept === undefined ? DEFAULT_BACKUP_DAYS : Number(kept),
  };
}
