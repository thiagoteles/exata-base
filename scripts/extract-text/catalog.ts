/* Reading and writing the nested catalog of one area by dotted keys. */

export type Tree = { [key: string]: Tree | string };

const isTree = (value: unknown): value is Tree =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Every leaf of the catalog as dotted key and sentence. */
export function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const leaves = new Map<string, string>();
  for (const [name, value] of Object.entries(tree)) {
    const key = prefix === "" ? name : `${prefix}.${name}`;
    if (typeof value === "string") {
      leaves.set(key, value);
    } else {
      for (const [inner, text] of flatten(value, key)) {
        leaves.set(inner, text);
      }
    }
  }
  return leaves;
}

/** Whether the key is a sentence or lies on the way to one, so a new sentence cannot take its place. */
export function occupied(tree: Tree, key: string): boolean {
  let node: Tree | string | undefined = tree;
  for (const part of key.split(".")) {
    if (!isTree(node)) {
      return true;
    }
    node = node[part];
    if (node === undefined) {
      return false;
    }
  }
  return true;
}

/** A copy of the catalog with the sentences added at their dotted keys. */
export function withEntries(tree: Tree, entries: ReadonlyMap<string, string>): Tree {
  const next = structuredClone(tree);
  for (const [key, text] of entries) {
    const parts = key.split(".");
    const leaf = parts.pop() ?? key;
    let node = next;
    for (const part of parts) {
      const child = node[part];
      if (child !== undefined && !isTree(child)) {
        throw new Error(`${key}: ${part} is already a sentence`);
      }
      const inner: Tree = child ?? {};
      node[part] = inner;
      node = inner;
    }
    node[leaf] = text;
  }
  return next;
}
