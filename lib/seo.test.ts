import { describe, expect, it } from "vitest";
import { publicRoutes } from "./public-routes";
import { robotsFor, sitemapFor } from "./seo";

describe("sitemap", () => {
  it("lists every public page with an absolute URL, and nothing behind sign-in", () => {
    const urls = sitemapFor("https://app.test").map((entry) => entry.url);
    expect(urls).toEqual(publicRoutes.map((path) => new URL(path, "https://app.test").toString()));
    expect(urls.some((url) => /\/(account|admin|staff|catalog)/.test(url))).toBe(false);
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
