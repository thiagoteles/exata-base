// biome-ignore lint/style/noExportedImports: z is re-exported only after the catalog error map is set
import { z } from "zod";
import type messages from "@/messages/pt-BR.json";

/*
 * The only place that imports zod for app schemas. Every validation message is a catalog key plus
 * its ICU values, encoded as JSON, so the same schema serves the server action and the form, and
 * the text is translated where it is shown.
 */

export type ValidationKey = keyof (typeof messages)["validation"];
export type ValidationValues = Readonly<Record<string, string | number>>;
export type ValidationMessage = { key: ValidationKey; values: ValidationValues };

// A record over ValidationKey: the compiler rejects it when a catalog key is missing or extra.
const validationKeys: Readonly<Record<ValidationKey, true>> = {
  required: true,
  invalid: true,
  invalidType: true,
  invalidOption: true,
  invalidEmail: true,
  invalidUrl: true,
  invalidDate: true,
  invalidMoney: true,
  tooShort: true,
  tooLong: true,
  tooSmall: true,
  tooBig: true,
  tooFew: true,
  tooMany: true,
};

const isValidationKey = (value: unknown): value is ValidationKey =>
  typeof value === "string" && Object.hasOwn(validationKeys, value);

export function validationMessage(key: ValidationKey, values: ValidationValues = {}): string {
  return JSON.stringify({ key, values });
}

/** Reads a message produced by `validationMessage`. Anything else falls back to `invalid`. */
export function readValidationMessage(message: string): ValidationMessage {
  try {
    const parsed: unknown = JSON.parse(message);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "key" in parsed &&
      isValidationKey(parsed.key)
    ) {
      const values =
        "values" in parsed && typeof parsed.values === "object" && parsed.values !== null
          ? parsed.values
          : {};
      return { key: parsed.key, values: values as ValidationValues };
    }
  } catch {
    // Not an encoded message: a library or a schema produced plain text.
  }
  return { key: "invalid", values: {} };
}

type Issue = z.core.$ZodRawIssue;

function sizeKey(issue: Issue, small: boolean): string {
  const origin = "origin" in issue ? issue.origin : undefined;
  if (small) {
    const minimum = Number(issue["minimum"]);
    if (origin === "string") {
      return validationMessage("tooShort", { minimum });
    }
    if (origin === "array" || origin === "set") {
      return validationMessage("tooFew", { minimum });
    }
    return validationMessage("tooSmall", { minimum });
  }
  const maximum = Number(issue["maximum"]);
  if (origin === "string") {
    return validationMessage("tooLong", { maximum });
  }
  if (origin === "array" || origin === "set") {
    return validationMessage("tooMany", { maximum });
  }
  return validationMessage("tooBig", { maximum });
}

function issueMessage(issue: Issue): string {
  switch (issue.code) {
    case "invalid_type":
      return validationMessage(
        issue.input === undefined || issue.input === "" ? "required" : "invalidType",
      );
    case "too_small":
      return sizeKey(issue, true);
    case "too_big":
      return sizeKey(issue, false);
    case "invalid_format":
      if (issue["format"] === "email") {
        return validationMessage("invalidEmail");
      }
      if (issue["format"] === "url") {
        return validationMessage("invalidUrl");
      }
      return validationMessage("invalid");
    case "invalid_value":
      return validationMessage("invalidOption");
    case "custom":
      return typeof issue.message === "string" ? issue.message : validationMessage("invalid");
    default:
      return validationMessage("invalid");
  }
}

z.config({ customError: issueMessage });

export { z };
