/*
 * The names a new area takes, worked out from what the person gives: the area's address in
 * kebab case and plural (`service-orders`), the entity in Pascal case and singular
 * (`ServiceOrder`), and the plural noun a person reads (`Ordens de serviço`). The living sample of
 * the base is written with its own names in every form, and each form is swapped for the new one.
 */

export type AreaNames = { area: string; entity: string; label: string };

const kebabPlural = /^[a-z]+(-[a-z]+)*$/;
const pascalSingular = /^[A-Z][a-z]+([A-Z][a-z]+)*$/;
const SAMPLE: AreaNames = { area: "sample-items", entity: "SampleItem", label: "Amostras" };
export const SAMPLE_AREA = SAMPLE.area;

const words = (pascal: string) => pascal.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
const pascalOf = (kebab: string) =>
  kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function forms({ area, entity, label }: AreaNames) {
  const areaPascal = pascalOf(area);
  return [
    [area, "kebab area"],
    [area.replaceAll("-", "_"), "table"],
    [areaPascal, "Pascal area"],
    [lowerFirst(areaPascal), "camel area"],
    [entity, "Pascal entity"],
    [lowerFirst(entity), "camel entity"],
    [words(areaPascal), "area in words"],
    [words(entity), "entity in words"],
    [label, "label"],
    [label.toLowerCase(), "label in lower case"],
  ] as const;
}

export function validateNames({ area, entity, label }: AreaNames): string[] {
  const problems: string[] = [];
  if (!kebabPlural.test(area)) {
    problems.push("the area is the address in kebab case and plural, such as service-orders");
  }
  if (!pascalSingular.test(entity)) {
    problems.push("the entity is one thing in Pascal case, such as ServiceOrder");
  }
  if (label.trim() === "") {
    problems.push("the label is the plural noun a person reads, such as Ordens de serviço");
  }
  if (area === SAMPLE.area) {
    problems.push("the area is already the base's sample");
  }
  return problems;
}

/** Rewrites the sample's names, in every form, as the new area's. Longer forms go first. */
export function renamer(target: AreaNames): (text: string) => string {
  const from = forms(SAMPLE);
  const to = forms(target);
  const pairs = from
    .map(([name], index) => [name, to[index]?.[0] ?? name] as const)
    .sort(([a], [b]) => b.length - a.length);
  return (text) => pairs.reduce((result, [old, next]) => result.replaceAll(old, next), text);
}
