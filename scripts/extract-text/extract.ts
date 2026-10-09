import {
  type ArrowFunction,
  type FunctionDeclaration,
  type FunctionExpression,
  Node,
  Project,
  type SourceFile,
  SyntaxKind,
} from "ts-morph";
import { flatten, occupied, type Tree } from "./catalog";
import { freeKey, keyFor } from "./keys";

/*
 * Moves the sentences written inside a component into the catalog: text between JSX tags and the
 * props a person reads (`aria-label`, `placeholder`, `title`, `alt`) become `t("key")`, and the
 * sentence is returned for the area's catalog. Nothing is written here; the caller decides. An em
 * dash is refused rather than copied, because interface text carries none.
 */

const READ_PROPS = new Set(["aria-label", "placeholder", "title", "alt"]);
type Component = FunctionDeclaration | ArrowFunction | FunctionExpression;

const EM_DASH = "—";
const WHITESPACE = /\s+/g;
const LETTER = /\p{L}/u;
const COMPONENT_NAME = /^[A-Z]/;
const LEADING = /^\s*/;
const TRAILING = /\s*$/;
const DECLARED_T = /\bconst t = (await )?(useTranslations|getTranslations)\(/;

type Found = { start: number; end: number; text: string; component: string; kind: "text" | "prop" };

export type Extraction = {
  source: string;
  /** New sentences by dotted key, relative to the area. */
  entries: Map<string, string>;
  problems: string[];
  replaced: number;
};

const collapse = (text: string) => text.replaceAll(WHITESPACE, " ").trim();
const hasLetter = (text: string) => LETTER.test(text);

function isNamedComponent(node: Component): string | null {
  const own = Node.isFunctionDeclaration(node) ? node.getName() : undefined;
  const declared = Node.isVariableDeclaration(node.getParent()) ? node.getParent() : undefined;
  const name =
    own ?? (declared && Node.isVariableDeclaration(declared) ? declared.getName() : undefined);
  return name !== undefined && COMPONENT_NAME.test(name) ? name : null;
}

/** The component a node is written in: the nearest enclosing function named like one. */
function componentOf(node: Node): Component | null {
  let found: Component | null = null;
  for (const ancestor of node.getAncestors()) {
    if (
      Node.isFunctionDeclaration(ancestor) ||
      Node.isArrowFunction(ancestor) ||
      Node.isFunctionExpression(ancestor)
    ) {
      if (isNamedComponent(ancestor) !== null) {
        return ancestor;
      }
      found = ancestor;
    }
  }
  return found;
}

function candidates(source: string): Found[] {
  const file = new Project({ useInMemoryFileSystem: true }).createSourceFile("input.tsx", source);
  const found: Found[] = [];
  const nameOf = (node: Node) => {
    const component = componentOf(node);
    return (component && isNamedComponent(component)) ?? "text";
  };
  for (const node of file.getDescendantsOfKind(SyntaxKind.JsxText)) {
    const text = collapse(node.getText());
    if (hasLetter(text)) {
      found.push({
        start: node.getStart(true),
        end: node.getEnd(),
        text,
        component: nameOf(node),
        kind: "text",
      });
    }
  }
  for (const attribute of file.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
    const value = attribute.getInitializer();
    if (READ_PROPS.has(attribute.getNameNode().getText()) && Node.isStringLiteral(value)) {
      const text = collapse(value.getLiteralText());
      if (hasLetter(text)) {
        found.push({
          start: value.getStart(),
          end: value.getEnd(),
          text,
          component: nameOf(attribute),
          kind: "prop",
        });
      }
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** Text between tags keeps the whitespace around it, so the layout of the markup stays as written. */
function replacementFor(original: string, found: Found, key: string): string {
  const call = `t("${key}")`;
  if (found.kind === "prop") {
    return `{${call}}`;
  }
  const lead = LEADING.exec(original)?.[0] ?? "";
  const trail = TRAILING.exec(original)?.[0] ?? "";
  return `${lead}{${call}}${trail}`;
}

function hookFor(area: string, isAsync: boolean): string {
  return isAsync
    ? `const t = await getTranslations("${area}");`
    : `const t = useTranslations("${area}");`;
}

/** The components that call `t` with one of the new keys, each of which needs its own declaration. */
function ownersOf(file: SourceFile, keys: ReadonlySet<string>): Set<Component> {
  const owners = new Set<Component>();
  for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const [first] = call.getArguments();
    const owner = componentOf(call);
    if (
      owner &&
      call.getExpression().getText() === "t" &&
      Node.isStringLiteral(first) &&
      keys.has(first.getLiteralText())
    ) {
      owners.add(owner);
    }
  }
  return owners;
}

function addImport(file: SourceFile, moduleSpecifier: string, name: string) {
  if (file.getImportDeclaration(moduleSpecifier) === undefined) {
    file.addImportDeclaration({ moduleSpecifier, namedImports: [name] });
  }
}

function addHooks(source: string, area: string, keys: ReadonlySet<string>, problems: string[]) {
  if (DECLARED_T.test(source)) {
    return source;
  }
  const file = new Project({ useInMemoryFileSystem: true }).createSourceFile("output.tsx", source);
  const used = new Set<boolean>();
  for (const owner of ownersOf(file, keys)) {
    const body = owner.getBody();
    if (Node.isBlock(body)) {
      body.insertStatements(0, hookFor(area, owner.isAsync()));
      used.add(owner.isAsync());
    } else {
      problems.push(
        "A component returns JSX directly: give it a block body, then declare t there.",
      );
    }
  }
  if (used.has(false)) {
    addImport(file, "next-intl", "useTranslations");
  }
  if (used.has(true)) {
    addImport(file, "next-intl/server", "getTranslations");
  }
  return file.getFullText();
}

/**
 * The component with its sentences moved out. `existing` is the area's catalog, so a sentence that is
 * already there keeps its key and a new one never takes a key that is in use.
 */
export function extractText(source: string, area: string, existing: Tree): Extraction {
  const found = candidates(source);
  const problems = found
    .filter((item) => item.text.includes(EM_DASH))
    .map((item) => `"${item.text}" has an em dash: rewrite it with a comma or a period first`);
  if (problems.length > 0) {
    return { source, entries: new Map(), problems, replaced: 0 };
  }
  const known = new Map([...flatten(existing)].map(([key, text]) => [text, key]));
  const entries = new Map<string, string>();
  const keyOf = new Map<Found, string>();
  for (const item of found) {
    let key = known.get(item.text);
    if (key === undefined) {
      key = freeKey(
        keyFor(item.component, item.text),
        (candidate) => occupied(existing, candidate) || entries.has(candidate),
      );
      entries.set(key, item.text);
      known.set(item.text, key);
    }
    keyOf.set(item, key);
  }
  let next = source;
  for (const item of [...found].reverse()) {
    const original = next.slice(item.start, item.end);
    next =
      next.slice(0, item.start) +
      replacementFor(original, item, keyOf.get(item) ?? "") +
      next.slice(item.end);
  }
  const keys = new Set(keyOf.values());
  return {
    source: found.length === 0 ? source : addHooks(next, area, keys, problems),
    entries,
    problems,
    replaced: found.length,
  };
}
