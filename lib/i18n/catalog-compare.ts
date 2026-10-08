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

/** What is wrong with `other` compared with `base`, as readable lines. Empty means they match. */
export function compareCatalogs(base: Catalog, other: Catalog): string[] {
  const left = flatten(base);
  const right = flatten(other);
  const problems: string[] = [];
  for (const [key, message] of left) {
    const translated = right.get(key);
    if (translated === undefined) {
      problems.push(`missing key: ${key}`);
    } else if (messageArguments(message).join() !== messageArguments(translated).join()) {
      problems.push(`different arguments in: ${key}`);
    }
  }
  for (const key of right.keys()) {
    if (!left.has(key)) {
      problems.push(`extra key: ${key}`);
    }
  }
  return problems;
}
