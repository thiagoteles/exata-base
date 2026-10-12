import { describe, expect, it } from "vitest";
import { publicRoutes } from "./public-routes";
import { robotsFor, sitemapFor } from "./seo";

describe("sitemap", () => {
  it("lists every public page with an absolute URL, and nothing behind sign-in", () => {
    const urls = sitemapFor("https://app.test").map((entry) => entry.url);
    expect(urls).toHaveLength(publicRoutes.length);
    expect(urls).toContain("https://app.test/");
    expect(urls).toContain("https://app.test/contato");
    expect(urls).not.toContain("https://app.test/contact");
    expect(urls.some((url) => /\/(account|admin|staff|catalog)/.test(url))).toBe(false);
  });
});

describe("sitemap in more than one language", () => {
  const entries = sitemapFor("https://app.test", [], ["pt-BR", "en-US"]);

  it("lists each page once per language, in that language's own address", () => {
    const urls = entries.map((entry) => entry.url);
    expect(urls).toHaveLength(publicRoutes.length * 2);
    expect(urls).toContain("https://app.test/contato");
    expect(urls).toContain("https://app.test/en/contact");
    expect(urls).not.toContain("https://app.test/en/contato");
  });

  it("names the other forms of each page, the same set on every entry of that page", () => {
    const contact = entries.find((entry) => entry.url === "https://app.test/en/contact");
    expect(contact?.alternates?.languages).toEqual({
      "pt-BR": "https://app.test/contato",
      "en-US": "https://app.test/en/contact",
    });
  });
});

describe("robots", () => {
  it("closes the whole site outside production", () => {
    expect(robotsFor("https://app.test", false)).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
  });

  it("opens the public site in production and keeps the private areas out", () => {
    const robots = robotsFor("https://app.test", true);
    expect(robots.sitemap).toBe("https://app.test/sitemap.xml");
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(rule?.disallow).toEqual(
      expect.arrayContaining(["/account", "/admin", "/staff", "/catalog", "/api/"]),
    );
  });
});
