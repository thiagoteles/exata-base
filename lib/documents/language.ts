import { createTranslator } from "next-intl";
import type { Locale } from "@/lib/i18n/locales";
import english from "@/messages/documents.en.json";
import portuguese from "@/messages/pt-BR.json";

/*
 * The language of a document, which is not the language of the interface. A person using the app
 * in Portuguese sends an invoice in English to a client abroad, and the same invoice may be asked
 * for again in the other language, so the language belongs to the document and is chosen for each.
 * The catalogs have the same keys. Portuguese is the interface's own `documents` area; English is a
 * catalog of its own, so adding it does not switch on the interface's language routing.
 */

export const documentLanguages = ["pt-BR", "en"] as const;
export type DocumentLanguage = (typeof documentLanguages)[number];

export const defaultDocumentLanguage: DocumentLanguage = "pt-BR";

export const isDocumentLanguage = (value: unknown): value is DocumentLanguage =>
  documentLanguages.some((language) => language === value);

/** The `documents` area in the language of the document: `t("receipt.title")`. */
export function documentTranslator(language: DocumentLanguage) {
  const messages = language === "en" ? english : { documents: portuguese.documents };
  return createTranslator({
    // The interface's list of locales is what the type allows; a document's language only picks the
    // sentences and the plural and number rules, so it is stated as the type's own.
    locale: language as Locale,
    messages,
    namespace: "documents",
  });
}
