import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeWhole } from "./write-whole";

let folder = "";

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe("a generated file", () => {
  it("is replaced whole and leaves nothing beside it", () => {
    folder = mkdtempSync(path.join(tmpdir(), "write-whole-"));
    const file = path.join(folder, "catalog.json");
    writeWhole(file, '{"a":1}\n');
    writeWhole(file, '{"a":2}\n');
    expect(readFileSync(file, "utf8")).toBe('{"a":2}\n');
    expect(readdirSync(folder)).toEqual(["catalog.json"]);
  });
});
