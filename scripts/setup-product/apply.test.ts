import { describe, expect, it } from "vitest";
import {
  applyCatalog,
  applyDesign,
  applyPackage,
  applyReadme,
  type ProductInput,
  packageSlug,
  readCurrent,
  validateProduct,
} from "./apply";

const input: ProductInput = {
  name: "Casa Aberta",
  description: "Agenda de visitas para imobiliárias pequenas.",
  audience: "Corretores e donos de imobiliárias",
  tone: "calm, direct, trustworthy",
  surfaces: "public site, member area, admin",
};

const design = [
  "---",
  'name: "TO FILL IN: product name"',
  'description: "TO FILL IN: one sentence"',
  "colors:",
  '  brand: "oklch(55% 0.13 245)"',
  "---",
  "",
  "# TO FILL IN: product name",
  "",
  "- Name: TO FILL IN.",
  "- Who it is for: TO FILL IN.",
  "- Tone: TO FILL IN. Three words on how the product should sound and look.",
  "- Surfaces the product uses: TO FILL IN (public site, member area, staff area, admin).",
  "",
  "| Date | Decision | Rationale |",
  "| TO FILL IN | Product created from this base | System inherited unchanged, with the product's color seeds |",
].join("\n");

describe("the answers", () => {
  it("accepts a complete set and names each problem otherwise", () => {
    expect(validateProduct(input)).toEqual([]);
    expect(validateProduct({ ...input, name: " " })).toEqual(["name is required"]);
    expect(validateProduct({ ...input, tone: "TO FILL IN" })).toEqual(["tone is required"]);
    expect(validateProduct({ ...input, description: "Uma frase — com travessão" })).toEqual([
      "description must not contain an em dash, use a comma, a period or a hyphen",
    ]);
    expect(validateProduct({ ...input, name: "x".repeat(61) })).toEqual([
      "name must be at most 60 characters",
    ]);
  });

  it("makes a package name from the product name", () => {
    expect(packageSlug("Casa Aberta")).toBe("casa-aberta");
    expect(packageSlug("  Ação & Reação! ")).toBe("acao-reacao");
    expect(packageSlug("???")).toBe("product");
  });
});

describe("writing the files", () => {
  it("sets the site name and description in the catalog and keeps the rest", () => {
    const json = JSON.stringify({ site: { name: "x", description: "y" }, other: { a: "b" } });
    const result = JSON.parse(applyCatalog(json, input)) as Record<string, Record<string, string>>;
    expect(result["site"]).toEqual({ name: "Casa Aberta", description: input.description });
    expect(result["other"]).toEqual({ a: "b" });
  });

  it("sets the package name and description, the description right after the name", () => {
    const result = applyPackage(JSON.stringify({ name: "product", version: "0.1.0" }), input);
    expect(Object.keys(JSON.parse(result))).toEqual(["name", "description", "version"]);
    expect(JSON.parse(result).name).toBe("casa-aberta");
  });

  it("replaces the README title and its first paragraph", () => {
    const result = applyReadme(
      "# Product name\n\nTO FILL IN: one sentence.\n\n## Start\n\ntext\n",
      input,
    );
    expect(result).toBe(`# Casa Aberta\n\n${input.description}\n\n## Start\n\ntext\n`);
  });

  it("fills the DESIGN.md frontmatter, title, product block and decision row", () => {
    const result = applyDesign(design, input, "2026-10-09");
    expect(result).toContain('name: "Casa Aberta"');
    expect(result).toContain("# Casa Aberta");
    expect(result).toContain("- Name: Casa Aberta.");
    expect(result).toContain("- Who it is for: Corretores e donos de imobiliárias.");
    expect(result).toContain("- Tone: calm, direct, trustworthy.");
    expect(result).toContain("- Surfaces the product uses: public site, member area, admin.");
    expect(result).toContain("| 2026-10-09 | Product created from this base |");
    expect(result).not.toContain("TO FILL IN");
    expect(result).toContain('brand: "oklch(55% 0.13 245)"');
  });

  it("changes the same lines when run again, so a value can be corrected", () => {
    const first = applyDesign(design, input, "2026-10-09");
    const second = applyDesign(first, { ...input, name: "Casa Nova", tone: "warm" }, "2026-10-10");
    expect(second).toContain("# Casa Nova");
    expect(second).toContain("- Tone: warm.");
    expect(second).toContain("| 2026-10-10 | Product created from this base |");
    expect(second.split("\n")).toHaveLength(first.split("\n").length);
  });
});

describe("reading what is already there", () => {
  it("reads the placeholder as empty and real answers back", () => {
    const catalog = JSON.stringify({
      site: { name: "Meu produto", description: "Descreva aqui, algo" },
    });
    expect(readCurrent(catalog, design)).toMatchObject({ name: "", description: "", audience: "" });
    const filled = applyDesign(design, input, "2026-10-09");
    const written = applyCatalog(catalog, input);
    expect(readCurrent(written, filled)).toMatchObject({
      name: "Casa Aberta",
      audience: "Corretores e donos de imobiliárias",
      tone: "calm, direct, trustworthy",
      surfaces: "public site, member area, admin",
    });
  });
});
