import { describe, expect, it } from "vitest";
import {
  applyBackupReadme,
  applyCatalog,
  applyDesign,
  applyPackage,
  applyPrivacy,
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
  backupDays: 7,
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
  it("sets the site name and description in the site area file", () => {
    const result = JSON.parse(applyCatalog(JSON.stringify({ name: "x", description: "y" }), input));
    expect(result).toEqual({ name: "Casa Aberta", description: input.description });
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

describe("the backup retention", () => {
  const readme =
    "Keep it for 7 days, the period the privacy policy promises: x (`--soft-delete-duration=7d`).";
  const privacy = JSON.stringify({
    sections: {
      backups: {
        body: "A cópia fica guardada e a guardamos por 7 dias. Some no máximo 7 dias depois.",
      },
    },
  });

  it("is written into the README and the bucket's soft delete", () => {
    expect(applyBackupReadme(readme, 30)).toBe(
      "Keep it for 30 days, the period the privacy policy promises: x (`--soft-delete-duration=30d`).",
    );
  });

  it("is written into the privacy policy in the words the person reads, singular included", () => {
    const body = (days: number) =>
      (JSON.parse(applyPrivacy(privacy, days)) as { sections: { backups: { body: string } } })
        .sections.backups.body;
    expect(body(30)).toContain("guardamos por 30 dias");
    expect(body(30)).toContain("no máximo 30 dias depois");
    expect(body(1)).toContain("guardamos por 1 dia.");
    expect(body(1)).toContain("no máximo 1 dia depois");
  });

  it("can be corrected by running again, and is read back as the default", () => {
    const again = applyBackupReadme(applyBackupReadme(readme, 30), 14);
    expect(again).toContain("Keep it for 14 days,");
    expect(readCurrent(JSON.stringify({ name: "x", description: "y" }), "", again).backupDays).toBe(
      14,
    );
    expect(readCurrent(JSON.stringify({ name: "x", description: "y" }), "").backupDays).toBe(7);
    const privacyAgain = applyPrivacy(applyPrivacy(privacy, 30), 14);
    expect(privacyAgain).toContain("guardamos por 14 dias");
  });

  it("is a whole number of days, at least one", () => {
    for (const backupDays of [0, -1, 1.5, 91, Number.NaN]) {
      expect(validateProduct({ ...input, backupDays })).toEqual([
        "backup retention must be a whole number of days from 1 to 90",
      ]);
    }
  });
});

describe("reading what is already there", () => {
  it("reads the placeholder as empty and real answers back", () => {
    const catalog = JSON.stringify({ name: "Meu produto", description: "Descreva aqui, algo" });
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
