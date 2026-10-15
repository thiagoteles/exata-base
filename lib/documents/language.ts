import { createTranslator } from "next-intl";
import type { Locale } from "@/lib/i18n/locales";
import englishBase from "@/messages/documents.en.json";
import englishProduct from "@/messages/documents.en.product.json";
import portuguese from "@/messages/pt-BR.json";
import type { DocumentLanguage } from "./languages";

/*
 * The language of a document, which is not the language of the interface. A person using the app
 * in Portuguese sends an invoice in English to a client abroad, and the same invoice may be asked
 * for again in the other language, so the language belongs to the document and is chosen for each.
 * The catalogs have the same keys. Portuguese is the interface's own `documents` area; English is a
 * catalog of its own, so adding it does not switch on the interface's language routing. The
 * product's English documents are in its own file, beside the base's receipt.
 */

/** The English documents: the base's and the product's. */
export const english = { documents: { ...englishBase.documents, ...englishProduct.documents } };

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
