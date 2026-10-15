import { describe, expect, it } from "vitest";
import { articles } from "./content/articles-index";
import { isMissingPage } from "./known-pages";

describe("known pages", () => {
  it("tells a missing article from an existing one, and leaves other addresses alone", () => {
    // Whatever the product publishes: every article it has is a page.
    for (const { slug } of articles) {
      expect(isMissingPage(`/articles/${slug}`)).toBe(false);
    }
    expect(isMissingPage("/articles/nao-existe")).toBe(true);
    expect(isMissingPage("/articles")).toBe(false);
    expect(isMissingPage("/account")).toBe(false);
  });
});
