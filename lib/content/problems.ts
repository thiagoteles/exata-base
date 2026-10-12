import type { z } from "@/lib/validation";
import { readValidationMessage } from "@/lib/validation";
import { frontmatterSchema } from "./frontmatter";

/*
 * What the content check tells the person who wrote an article, in Portuguese and in their own
 * terms: the file, the field and what is wrong with it. The schema's own messages are catalog keys
 * (see `lib/validation`), so the same words that a form shows are the ones used here, and nothing is
 * left as a raw key or as the validation library's English.
 */

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** The frontmatter field names a writer may use, for the line that says which are accepted. */
const fieldNames = Object.keys(frontmatterSchema.shape);

const named = (t: Translate, name: string) =>
  fieldNames.includes(name) ? `${name} (${t(`contentCheck.fieldNames.${name}`)})` : name;

/** One line per thing wrong in the frontmatter of one article. */
export function frontmatterProblems(file: string, error: z.ZodError, t: Translate): string[] {
  return error.issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((unknown) =>
        t("contentCheck.field", {
          file,
          field: unknown,
          problem: t("contentCheck.unknownField", {
            accepted: fieldNames.map((name) => named(t, name)).join(", "),
          }),
        }),
      );
    }
    if (issue.code === "invalid_format" && issue.format === "date") {
      return [
        t("contentCheck.field", {
          file,
          field: named(t, String(issue.path[0])),
          problem: t("contentCheck.isoDate"),
        }),
      ];
    }
    const [first] = issue.path;
    const field = first === undefined ? undefined : String(first);
    const { key, values } = readValidationMessage(issue.message);
    const problem = t(`validation.${key}`, { ...values });
    return field === undefined
      ? [t("contentCheck.notFields", { file })]
      : [t("contentCheck.field", { file, field: named(t, field), problem })];
  });
}

export const missingBlock = (file: string, t: Translate) =>
  t("contentCheck.missingBlock", { file });
export const invalidYaml = (file: string, detail: string, t: Translate) =>
  t("contentCheck.yaml", { file, detail });
export const emDash = (file: string, line: number, column: number, t: Translate) =>
  t("contentCheck.emDash", { file, line, column });
export const badSlug = (file: string, t: Translate) => t("contentCheck.slug", { file });
