import { describe, expect, it } from "vitest";
import { reportCatalog } from "@/lib/i18n/catalog-report";
import { isLocale } from "@/lib/i18n/locales";
import english from "@/messages/documents.en.json";
import portuguese from "@/messages/pt-BR.json";
import { documentTranslator } from "./language";
import { defaultDocumentLanguage, documentLanguages, isDocumentLanguage } from "./languages";

type Tree = { [key: string]: string | Tree };

function leaves(
  tree: Tree,
  prefix = "",
  into: Record<string, string> = {},
): Record<string, string> {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") {
      into[path] = value;
    } else {
      leaves(value, path, into);
    }
  }
  return into;
}

describe("the language of a document", () => {
  it("is its own list, apart from the interface's languages", () => {
    expect(documentLanguages).toEqual(["pt-BR", "en"]);
    expect(defaultDocumentLanguage).toBe("pt-BR");
    expect(isDocumentLanguage("en")).toBe(true);
    expect(isDocumentLanguage("es")).toBe(false);
    expect(isDocumentLanguage(undefined)).toBe(false);
    expect(isLocale("en")).toBe(false);
  });

  it("has the same keys and arguments in both languages", () => {
    const report = reportCatalog({
      locale: "documents.en",
      defaultLocale: "pt-BR",
      complete: true,
      base: { documents: portuguese.documents },
      other: english,
    });
    expect(report.problems).toEqual([]);
  });

  it("says every sentence in its own language: no English value repeats the Portuguese one", () => {
    const pt = leaves({ documents: portuguese.documents });
    const en = leaves(english);
    // A word that is the same in both, such as the name of a payment method.
    const sameInBoth = new Set([
      "documents.receipt.methods.pix",
      "documents.receipt.methods.boleto",
    ]);
    const repeated = Object.keys(pt).filter((key) => pt[key] === en[key] && !sameInBoth.has(key));
    expect(repeated).toEqual([]);
  });

  it("translates the same key into each language", () => {
    expect(documentTranslator("pt-BR")("receipt.title")).toBe("Recibo de pagamento");
    expect(documentTranslator("en")("receipt.title")).toBe("Payment receipt");
    expect(documentTranslator("en")("receipt.methods.unknown")).toBe("Not stated");
  });
});
