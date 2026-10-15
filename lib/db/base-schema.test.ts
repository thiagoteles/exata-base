import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { baseSchemaFiles } from "./base-schema";

const schemaFiles = readdirSync("lib/db/schema").filter(
  (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
);

describe("the two streams of migrations", () => {
  it("lists only base tables that exist", () => {
    for (const file of baseSchemaFiles) {
      expect(schemaFiles).toContain(file);
    }
  });

  it("gives every other schema file to the product, which registers it in its own schema", () => {
    const base = new Set<string>(baseSchemaFiles);
    const productSchema = readFileSync("lib/db/schema.product.ts", "utf8");
    for (const file of schemaFiles.filter((name) => !base.has(name))) {
      expect(productSchema).toContain(`"./schema/${file.replace(/\.ts$/, "")}"`);
    }
  });
});
