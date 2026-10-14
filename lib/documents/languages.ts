/*
 * The languages a document can be written in, apart from the interface's own. This list is kept
 * small and free of the catalogs so a form or a database schema can read it without carrying every
 * sentence of every language.
 */

export const documentLanguages = ["pt-BR", "en"] as const;
export type DocumentLanguage = (typeof documentLanguages)[number];

export const defaultDocumentLanguage: DocumentLanguage = "pt-BR";

export const isDocumentLanguage = (value: unknown): value is DocumentLanguage =>
  documentLanguages.some((language) => language === value);
