import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cn } from "./cn";
import {
  colorTokens,
  containerTokens,
  easeTokens,
  fontTokens,
  radiusTokens,
  shadowTokens,
  spacingTokens,
  textTokens,
} from "./design-tokens";

const css = ["styles/tokens.css", "styles/preset.css", "app/globals.css"]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

function declared(namespace: string): string[] {
  const names = [...css.matchAll(new RegExp(`(?<![\\w-])--${namespace}-([a-z0-9-]+):`, "g"))]
    .map((match) => match[1] ?? "")
    .filter((name) => !name.includes("--"));
  return [...new Set(names)].sort();
}

describe("cn", () => {
  it("knows every token the CSS declares", () => {
    expect([...colorTokens].sort()).toEqual(declared("color"));
    expect([...textTokens].sort()).toEqual(
      declared("text").filter((name) => !name.includes("-shadow")),
    );
    expect([...radiusTokens].sort()).toEqual(declared("radius"));
    expect([...shadowTokens].sort()).toEqual(declared("shadow"));
    expect([...easeTokens].sort()).toEqual(declared("ease"));
    expect([...fontTokens].sort()).toEqual(declared("font"));
    expect([...spacingTokens].sort()).toEqual(declared("spacing"));
    expect([...containerTokens].sort()).toEqual(declared("container"));
  });

  it("keeps a text size and a text color together", () => {
    expect(cn("text-body", "text-ink")).toBe("text-body text-ink");
  });

  it("lets the last class win within the same property", () => {
    expect(cn("text-body", "text-label")).toBe("text-label");
    expect(cn("bg-surface", false, "bg-sunken")).toBe("bg-sunken");
    expect(cn("rounded-control", "rounded-panel")).toBe("rounded-panel");
    expect(cn("h-control", "h-field")).toBe("h-field");
    expect(cn("h-4", "h-control")).toBe("h-control");
    expect(cn("p-panel-inset", "p-dialog-inset")).toBe("p-dialog-inset");
  });
});
