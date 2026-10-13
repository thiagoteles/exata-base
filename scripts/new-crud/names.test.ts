import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { childRenamer, renamer, validateNames } from "./names";
import {
  asTemplate,
  catalogKeys,
  childCatalogKeys,
  childFiles,
  childNavigation,
  childRegistrations,
  insertAfter,
  insertBefore,
  parentPage,
  registrations,
  removeLines,
  sampleFiles,
  setKey,
  TEMPLATE_ROOT,
} from "./plan";

const orders = { area: "service-orders", entity: "ServiceOrder", label: "Ordens de serviço" };
const rename = renamer(orders);

describe("the names of a new area", () => {
  it("are checked before anything is written", () => {
    expect(validateNames(orders)).toEqual([]);
    expect(validateNames({ area: "Service_Orders", entity: "service", label: " " })).toHaveLength(
      3,
    );
    expect(validateNames({ ...orders, area: "sample-items" })).toHaveLength(1);
    expect(validateNames({ ...orders, area: "sample-parts" })).toHaveLength(1);
  });

  it("replace the sample's in every form it takes", () => {
    expect(rename("/sample-items/new")).toBe("/service-orders/new");
    expect(rename('pgTable("sample_items"')).toBe('pgTable("service_orders"');
    expect(rename("SampleItemsList querySampleItems")).toBe("ServiceOrdersList queryServiceOrders");
    expect(rename("createSampleItem sampleItemStatuses")).toBe(
      "createServiceOrder serviceOrderStatuses",
    );
    expect(rename("The sample items an account keeps; a sample item")).toBe(
      "The service orders an account keeps; a service order",
    );
    expect(rename('"title": "Amostras", "Os registros de amostras"')).toBe(
      '"title": "Ordens de serviço", "Os registros de ordens de serviço"',
    );
  });

  it("leave no trace of the sample in any of its files", () => {
    for (const file of sampleFiles) {
      const text = rename(readFileSync(`${TEMPLATE_ROOT}/${file}`, "utf8"));
      expect(text, file).not.toMatch(/sample|amostra/i);
    }
  });
});

describe("the names of a child area", () => {
  const people = { area: "people", entity: "Person", label: "Tutores" };
  const pets = { area: "pets", entity: "Pet", label: "Animais" };
  const child = childRenamer(pets, people);

  it("become the child's, and the first sample's become the parent's", () => {
    expect(child("/sample-parts/new?parent=")).toBe("/pets/new?parent=");
    expect(child("SamplePartsOfSampleItem samplePartParents")).toBe("PetsOfPerson petParents");
    expect(child("sampleItemId: uuid(), sampleItems.ownerId")).toBe(
      "personId: uuid(), people.ownerId",
    );
    expect(child('"Registro de amostras", "Novo registro de peças"')).toBe(
      '"Registro de tutores", "Novo registro de animais"',
    );
  });

  it("leave no trace of either sample in any of the child's files", () => {
    for (const file of childFiles) {
      const text = child(readFileSync(`${TEMPLATE_ROOT}/${file}`, "utf8"));
      expect(text, file).not.toMatch(/sample|amostra|peça/i);
    }
    const lines = [
      ...childRegistrations.flatMap((entry) => entry.lines),
      childNavigation.line,
      parentPage.importLine,
      parentPage.sectionLine,
      ...childCatalogKeys.flatMap(({ path, value }) => [...path, value]),
    ];
    expect(lines.map(child).join("\n")).not.toMatch(/sample|amostra|peça/i);
  });
});

describe("the shared registries", () => {
  const text = 'const navItems: readonly NavItem[] = [\n  { key: "account" },\n];\n';

  it("get the new area's lines right after their anchor, once", () => {
    const line = rename('  { key: "sampleItems" },');
    const once = insertAfter(text, "const navItems: readonly NavItem[] = [", [line]);
    expect(once).toBe(
      'const navItems: readonly NavItem[] = [\n  { key: "serviceOrders" },\n  { key: "account" },\n];\n',
    );
    expect(insertAfter(once, "const navItems: readonly NavItem[] = [", [line])).toBe(once);
    expect(removeLines(once, [line])).toBe(text);
  });

  it("refuse to guess when an anchor is gone", () => {
    expect(() => insertAfter(text, "nowhere", ["x"])).toThrow(/anchor/);
    expect(() => insertBefore(text, "nowhere", ["x"])).toThrow(/anchor/);
  });

  it("get a line right before an anchor, once", () => {
    const once = insertBefore(text, '  { key: "account" },', ['  { key: "pets" },']);
    expect(once).toContain('  { key: "pets" },\n  { key: "account" },');
    expect(insertBefore(once, '  { key: "account" },', ['  { key: "pets" },'])).toBe(once);
  });

  it("set and remove a catalog key", () => {
    const json = setKey(
      '{ "items": { "account": "Conta" } }',
      ["items", "serviceOrders"],
      "Ordens",
    );
    expect(JSON.parse(json)).toEqual({ items: { account: "Conta", serviceOrders: "Ordens" } });
    expect(JSON.parse(setKey(json, ["items", "serviceOrders"], null))).toEqual({
      items: { account: "Conta" },
    });
  });

  // A product that made its first area no longer has the sample; the anchors stay either way.
  it("hold the sample's lines and keys, each after its anchor", () => {
    if (!existsSync(sampleFiles[0])) {
      return;
    }
    for (const { file, anchor, lines } of [
      ...registrations,
      ...childRegistrations,
      { file: childNavigation.file, anchor: childNavigation.line, lines: [] },
      { file: parentPage.file, anchor: parentPage.sectionAnchor, lines: [parentPage.sectionLine] },
    ]) {
      const content = readFileSync(file, "utf8");
      expect(content, file).toContain(anchor);
      for (const line of lines) {
        expect(content, file).toContain(line);
      }
    }
    for (const { file, path, value } of [...catalogKeys, ...childCatalogKeys]) {
      let node: unknown = JSON.parse(readFileSync(file, "utf8"));
      for (const key of path) {
        node = (node as Record<string, unknown>)[key];
      }
      expect(node, file).toBe(value);
    }
  });
});

describe("the template", () => {
  it("is the living samples, file for file, while they exist", () => {
    for (const file of [...sampleFiles, ...childFiles]) {
      if (existsSync(file)) {
        expect(readFileSync(`${TEMPLATE_ROOT}/${file}`, "utf8"), file).toBe(
          asTemplate(file, readFileSync(file, "utf8")),
        );
      }
    }
  });

  it("keeps the parent's page without the child's lines, for areas that have no children", () => {
    const page = readFileSync(`${TEMPLATE_ROOT}/${parentPage.file}`, "utf8");
    expect(page).toContain(parentPage.importAnchor);
    expect(page).toContain(parentPage.sectionAnchor);
    expect(page).not.toContain(parentPage.importLine);
    expect(page).not.toContain(parentPage.sectionLine);
  });
});

describe("the anchors", () => {
  it("are where every area is registered, with or without the sample", () => {
    for (const { file, anchor } of registrations) {
      expect(readFileSync(file, "utf8"), file).toContain(anchor);
    }
  });
});
