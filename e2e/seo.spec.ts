import { expect, test } from "@playwright/test";

/*
 * Every page the sitemap lists, read the way a search engine reads it: it answers, its title and
 * description are its own, its canonical is its own address, it has one main heading, its share
 * image exists, and no internal link on it is broken. A new public page is covered by being in the
 * sitemap.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test("every page in the sitemap is complete for search engines", async ({ page, request }) => {
  test.setTimeout(120_000);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const addresses = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? "");
  expect(addresses.length).toBeGreaterThan(0);

  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const links = new Set<string>();
  for (const address of addresses) {
    const { pathname } = new URL(address);
    const response = await page.goto(pathname);
    expect(response?.status(), pathname).toBe(200);

    const title = await page.title();
    expect(title, `${pathname} has a title`).not.toBe("");
    expect(titles.get(title), `${pathname} repeats the title of another page`).toBeUndefined();
    titles.set(title, pathname);

    const description =
      (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(description, `${pathname} has a description`).not.toBe("");
    expect(descriptions.get(description), `${pathname} repeats a description`).toBeUndefined();
    descriptions.set(description, pathname);

    await expect(page.locator('link[rel="canonical"]'), pathname).toHaveAttribute("href", address);
    await expect(page.locator("h1:visible"), `${pathname} has one main heading`).toHaveCount(1);

    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect((await request.get(new URL(image ?? "").pathname)).status(), `${pathname} image`).toBe(
      200,
    );

    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""))) {
      links.add(href.split("#")[0] ?? href);
    }
  }

  for (const href of links) {
    const status = (await request.get(href, { maxRedirects: 5 })).status();
    expect(status, `internal link ${href}`).toBeLessThan(400);
  }
});
