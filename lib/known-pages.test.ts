import { describe, expect, it } from "vitest";
import { articles } from "./content/articles-index";
import { isMissingPage } from "./known-pages";

describe("known pages", () => {
  it("tells a missing article from an existing one, and leaves other addresses alone", async () => {
    // Whatever the product publishes: every article it has is a page.
    for (const { slug } of articles) {
      expect(await isMissingPage(`/articles/${slug}`)).toBe(false);
    }
    expect(await isMissingPage("/articles/nao-existe")).toBe(true);
    expect(await isMissingPage("/articles")).toBe(false);
    expect(await isMissingPage("/account")).toBe(false);
  });
});
