/*
 * A language that is not complete shows the default language's sentence wherever it has none of its
 * own. The merge walks the default catalog, so the result has exactly the default's keys: a key the
 * default does not have is dropped, and a sentence that is not text is ignored.
 */

type Catalog = { [key: string]: string | Catalog };

const isCatalog = (value: unknown): value is Catalog =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function withFallback<T extends Catalog>(base: T, other: Catalog): T {
  const merged: Catalog = {};
  for (const [key, value] of Object.entries(base)) {
    const own = Object.hasOwn(other, key) ? other[key] : undefined;
    if (typeof value === "string") {
      merged[key] = typeof own === "string" && own.trim() !== "" ? own : value;
    } else {
      merged[key] = withFallback(value, isCatalog(own) ? own : {});
    }
  }
  return merged as T;
}
