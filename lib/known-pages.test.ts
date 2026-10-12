import { describe, expect, it } from "vitest";
import { isMissingPage } from "./known-pages";

describe("known pages", () => {
  it("tells a missing article from an existing one, and leaves other addresses alone", () => {
    expect(isMissingPage("/articles/como-escrever-um-artigo")).toBe(false);
    expect(isMissingPage("/articles/nao-existe")).toBe(true);
    expect(isMissingPage("/articles")).toBe(false);
    expect(isMissingPage("/account")).toBe(false);
  });
});
