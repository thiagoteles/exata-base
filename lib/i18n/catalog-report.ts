import { differences, translationProgress } from "./catalog-compare";

type Catalog = { [key: string]: string | Catalog };

export type CatalogReport = {
  /** What makes `pnpm check` fail. */
  problems: string[];
  /** What is only worth knowing: how much of an incomplete language is left. */
  notes: string[];
};

const AREAS_SHOWN = 5;

/**
 * What to say about one language's catalog. A complete language must match the default exactly. One
 * that is still being translated may miss keys, which are counted instead of refused; a key the
 * default lacks and a message with other arguments are errors either way.
 */
export function reportCatalog(input: {
  locale: string;
  defaultLocale: string;
  complete: boolean;
  base: Catalog;
  other: Catalog;
}): CatalogReport {
  const { locale, defaultLocale, complete, base, other } = input;
  const found = differences(base, other);
  const problems = [
    ...(complete ? found.missing.map((key) => `missing key: ${key}`) : []),
    ...found.mismatched.map((key) => `different arguments in: ${key}`),
    ...found.extra.map((key) => `extra key: ${key}`),
  ].map((line) => `messages/${locale}.json: ${line}`);
  if (complete) {
    return { problems, notes: [] };
  }
  const progress = translationProgress(base, other);
  const percent = Math.round((progress.translated / progress.total) * 100);
  return {
    problems,
    notes: [
      `${locale} is not complete: ${progress.translated} of ${progress.total} messages translated (${percent}%); the rest shows in ${defaultLocale}.`,
      ...progress.missingByArea
        .slice(0, AREAS_SHOWN)
        .map(([area, count]) => `  ${area}: ${count} missing`),
    ],
  };
}
