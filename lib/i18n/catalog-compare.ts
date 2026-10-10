/*
 * Compares a language catalog with the default one at run time, for `pnpm check`: the same keys in
 * both directions and the same ICU arguments in every message. It is the check the compiler cannot
 * make for a file that may or may not exist.
 */

type Catalog = { [key: string]: string | Catalog };

const argumentPattern = /\{\s*([A-Za-z_]\w*)\s*[,}]/g;

/** Argument names of an ICU message: `{name}` and `{count, plural, ...}` give "name" and "count". */
export function messageArguments(message: string): string[] {
  // A plural branch like `{# itens}` starts with `#`, so only real names match.
  return [...new Set([...message.matchAll(argumentPattern)].map((match) => match[1] ?? ""))].sort();
}

function flatten(catalog: Catalog, prefix = ""): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(catalog)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") {
      entries.set(path, value);
    } else {
      for (const [inner, text] of flatten(value, path)) {
        entries.set(inner, text);
      }
    }
  }
  return entries;
}

export type CatalogDifferences = {
  /** Keys the default has and the other lacks. */
  missing: string[];
  /** Keys both have whose ICU arguments differ. */
  mismatched: string[];
  /** Keys the other has and the default lacks. */
  extra: string[];
};

export function differences(base: Catalog, other: Catalog): CatalogDifferences {
  const left = flatten(base);
  const right = flatten(other);
  const found: CatalogDifferences = { missing: [], mismatched: [], extra: [] };
  for (const [key, message] of left) {
    const translated = right.get(key);
    if (translated === undefined) {
      found.missing.push(key);
    } else if (messageArguments(message).join() !== messageArguments(translated).join()) {
      found.mismatched.push(key);
    }
  }
  for (const key of right.keys()) {
    if (!left.has(key)) {
      found.extra.push(key);
    }
  }
  return found;
}

/** What is wrong with `other` compared with `base`, as readable lines. Empty means they match. */
export function compareCatalogs(base: Catalog, other: Catalog): string[] {
  const { missing, mismatched, extra } = differences(base, other);
  return [
    ...missing.map((key) => `missing key: ${key}`),
    ...mismatched.map((key) => `different arguments in: ${key}`),
    ...extra.map((key) => `extra key: ${key}`),
  ];
}

export type Progress = {
  total: number;
  translated: number;
  /** Missing keys counted by area, the first segment of the key, most missing first. */
  missingByArea: [string, number][];
};

/** How much of the default catalog another language already has. */
export function translationProgress(base: Catalog, other: Catalog): Progress {
  const total = flatten(base).size;
  const { missing } = differences(base, other);
  const byArea = new Map<string, number>();
  for (const key of missing) {
    const area = key.split(".")[0] ?? key;
    byArea.set(area, (byArea.get(area) ?? 0) + 1);
  }
  return {
    total,
    translated: total - missing.length,
    missingByArea: [...byArea].sort(([, a], [, b]) => b - a),
  };
}
