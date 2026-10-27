import { describe, expect, it, vi } from "vitest";

const checks = vi.hoisted(() => ({
  draw: vi.fn((params: Record<string, string>) => Promise.resolve(params["id"] === "1")),
}));

vi.mock("./known-pages.product", () => ({
  productDynamicRoutes: [{ route: "/draws/[id]", exists: checks.draw }],
}));

const { isMissingPage } = await import("./known-pages");

describe("a product's dynamic page checked against the database", () => {
  // Fails when an asynchronous check is read as a page that exists, whatever it answers.
  it("is missing when the check it awaits answers no", async () => {
    expect(await isMissingPage("/draws/1")).toBe(false);
    expect(await isMissingPage("/draws/9")).toBe(true);
  });

  // Fails when every visit runs every product check, reading the database for addresses not its own.
  it("is not asked about an address its route does not fit", async () => {
    checks.draw.mockClear();
    expect(await isMissingPage("/articles/nao-existe")).toBe(true);
    expect(await isMissingPage("/account")).toBe(false);
    expect(checks.draw).not.toHaveBeenCalled();
  });
});
