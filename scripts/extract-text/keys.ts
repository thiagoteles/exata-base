/*
 * Proposing a catalog key for a sentence found in a component: the component that shows it, then the
 * first words of the sentence in camel case. The same sentence always gets the same key, and a
 * different sentence that would land on a taken key gets a number, so two screens never share a key
 * by accident.
 */

const MAX_WORDS = 4;
const MARKS = /\p{M}/gu;
const NOT_ALPHANUMERIC = /[^a-z0-9]+/;
const STARTS_WITH_DIGIT = /^\d/;

const lowerFirst = (word: string) => word.charAt(0).toLowerCase() + word.slice(1);
const upperFirst = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** The first words of a sentence as one camel-case word, without accents. */
export function slugOf(text: string): string {
  const words = text
    .normalize("NFD")
    .replaceAll(MARKS, "")
    .toLowerCase()
    .split(NOT_ALPHANUMERIC)
    .filter((word) => word.length > 0)
    .slice(0, MAX_WORDS);
  const [first, ...rest] = words;
  if (first === undefined || STARTS_WITH_DIGIT.test(first)) {
    return "text";
  }
  return first + rest.map(upperFirst).join("");
}

/** A component name as a key segment: `PlanCard` becomes `planCard`. */
const segmentOf = (componentName: string): string =>
  componentName.length === 0 ? "text" : lowerFirst(componentName);

export type Taken = (key: string) => boolean;

/** `base`, or `base2`, `base3` and so on until `taken` says the key is free. */
export function freeKey(base: string, taken: Taken): string {
  let key = base;
  for (let n = 2; taken(key); n += 1) {
    key = `${base}${n}`;
  }
  return key;
}

export const keyFor = (component: string, text: string): string =>
  `${segmentOf(component)}.${slugOf(text)}`;
