import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cn } from "./cn";
import {
  colorTokens,
  easeTokens,
  fontTokens,
  radiusTokens,
  shadowTokens,
  textTokens,
} from "./design-tokens";

const css = readFileSync("styles/tokens.css", "utf8") + readFileSync("app/globals.css", "utf8");

function declared(namespace: string): string[] {
  const names = [...css.matchAll(new RegExp(`(?<![\\w-])--${namespace}-([a-z-]+):`, "g"))]
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
  });

  it("keeps a text size and a text color together", () => {
    expect(cn("text-body", "text-ink")).toBe("text-body text-ink");
  });

  it("lets the last class win within the same property", () => {
    expect(cn("text-body", "text-label")).toBe("text-label");
    expect(cn("bg-surface", false, "bg-sunken")).toBe("bg-sunken");
    expect(cn("rounded-control", "rounded-panel")).toBe("rounded-panel");
  });
});
