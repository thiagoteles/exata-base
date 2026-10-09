import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "@/messages/pt-BR.json";
import { frontmatterSchema } from "./frontmatter";
import {
  badSlug,
  emDash,
  frontmatterProblems,
  invalidYaml,
  missingBlock,
  type Translate,
} from "./problems";

const translator = createTranslator({ locale: "pt-BR", messages });
const t = translator as unknown as Translate;
const file = "content/pt-BR/articles/exemplo.mdx";

function problemsOf(data: unknown): string[] {
  const parsed = frontmatterSchema.safeParse(data);
  if (parsed.success) {
    throw new Error("the frontmatter was expected to be invalid");
  }
  return frontmatterProblems(file, parsed.error, t);
}

const valid = {
  title: "Um título",
  description: "Uma descrição",
  publishedAt: "2026-10-09",
  author: "Ana Souza",
};

describe("what the content check says about an article", () => {
  it("names the file, the field in both languages and what is wrong, never a raw key", () => {
    const lines = problemsOf({ ...valid, title: "x".repeat(81), author: "" });
    expect(lines).toContain(`${file}: campo title (título): Use no máximo 80 caracteres.`);
    expect(lines.some((line) => line.includes("campo author (autor)"))).toBe(true);
    for (const line of lines) {
      expect(line).not.toContain('{"key"');
      expect(line).toContain(file);
    }
  });

  it("says a missing field is missing", () => {
    const { author: _omitted, ...rest } = valid;
    expect(problemsOf(rest)).toEqual([`${file}: campo author (autor): Preencha este campo.`]);
  });

  it("explains a date in the format it wants", () => {
    const [line] = problemsOf({ ...valid, publishedAt: "09/10/2026" });
    expect(line).toContain("campo publishedAt (data de publicação)");
    expect(line).toContain("aaaa-mm-dd");
    expect(problemsOf({ ...valid, publishedAt: "2026-02-30" })[0]).toContain("aaaa-mm-dd");
  });

  it("names a field that does not exist and lists the ones that do", () => {
    const [line] = problemsOf({ ...valid, autor: "Ana" });
    expect(line).toContain("campo autor: esse campo não existe");
    expect(line).toContain("author (autor)");
    expect(line).toContain("updatedAt (data de atualização)");
  });

  it("says when the block is not a list of fields at all", () => {
    expect(problemsOf("só um texto")[0]).toContain("deve ser uma lista de campos");
    expect(problemsOf(undefined)[0]).toContain("deve ser uma lista de campos");
  });

  it("writes the file-level problems in Portuguese too", () => {
    expect(missingBlock(file, t)).toContain("falta o bloco de abertura");
    expect(invalidYaml(file, "linha 1", t)).toContain("não é um YAML válido: linha 1");
    expect(emDash(file, 7, 12, t)).toBe(
      `${file}:7:12: travessão no texto. Use vírgula, ponto ou hífen.`,
    );
    expect(badSlug(file, t)).toContain("palavras minúsculas ligadas por hífen");
  });
});
