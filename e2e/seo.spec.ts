import { expect, test } from "@playwright/test";

/*
 * The pages the sitemap lists, read the way a search engine reads them: each answers, its title and
 * description are its own, its canonical is its own address, it has one main heading, its share
 * image exists, and no internal link on it is broken. A new public page is covered by being in the
 * sitemap. A product can list tens of thousands of pages made from a few templates (a result per
 * contest), so the addresses are grouped by shape, any segment with a digit standing for its kind,
 * and the first, middle and last of each shape are read: every template, at both ends of its data.
 */

const DIGIT = /\d/;
const LOC = /<loc>([^<]+)<\/loc>/g;

/** An address's template: "/loterias/quina/resultado/6900" reads "/loterias/quina/resultado/#". */
const shapeOf = (pathname: string) =>
  pathname
    .split("/")
    .map((segment) => (DIGIT.test(segment) ? "#" : segment))
    .join("/");

/** The first, middle and last of each shape, in the order given; addresses or paths alike. */
function sample(addresses: readonly string[]): string[] {
  const shapes = new Map<string, string[]>();
  for (const address of addresses) {
    const shape = shapeOf(new URL(address, "http://localhost").pathname);
    shapes.set(shape, [...(shapes.get(shape) ?? []), address]);
  }
  return [...shapes.values()]
    .flatMap((group) => [...new Set([group[0], group[Math.floor(group.length / 2)], group.at(-1)])])
    .filter((address) => address !== undefined);
}

test.use({ storageState: { cookies: [], origins: [] } });

test("every kind of page in the sitemap is complete for search engines", async ({
  page,
  request,
}) => {
  const started = Date.now();
  test.setTimeout(120_000);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const listed = [...sitemap.matchAll(LOC)].map((match) => match[1] ?? "");
  expect(listed.length).toBeGreaterThan(0);
  const addresses = sample(listed);
  // The time grows with what is read: a page can take seconds on the development server (the
  // statistics read a whole history), and the links are known only once the pages are read.
  test.setTimeout(Math.max(120_000, addresses.length * 5000));

  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const links = new Set<string>();
  const images = new Set<string>();
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

    // Many pages share one image: each image is fetched once, after the pages.
    images.add(
      new URL(
        (await page.locator('meta[property="og:image"]').first().getAttribute("content")) ?? "",
      ).pathname,
    );

    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""))) {
      links.add(href.split("#")[0] ?? href);
    }
  }

  for (const image of images) {
    expect((await request.get(image)).status(), `share image ${image}`).toBe(200);
  }

  // The links found are sampled the same way: one broken template shows at its ends.
  const linked = sample([...links]);
  test.setTimeout(Date.now() - started + 60_000 + linked.length * 3000);
  for (const href of linked) {
    const status = (await request.get(href, { maxRedirects: 5 })).status();
    expect(status, `internal link ${href}`).toBeLessThan(400);
  }
});
