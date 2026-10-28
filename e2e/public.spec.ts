import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { articles } from "../lib/content/articles-index";
import { publicPathOf } from "../lib/i18n/public-paths";
import home from "../messages/pt-BR/home.json" with { type: "json" };
import site from "../messages/pt-BR/site.json" with { type: "json" };
import { appOrigin } from "./origin";

test.use({ storageState: { cookies: [], origins: [] } });

const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const themes = ["light", "dark"] as const;

async function violations(page: Page) {
  // A public page's entrance blends its colors for half a second; contrast is read once it lands.
  // Animations tied to scrolling never finish, so only the ones on the document's clock are awaited.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.timeline === document.timeline)
        .map((animation) => animation.finished),
    ),
  );
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
  );
}

const pages = [
  // The home is the product's: its title is read from the product's own words.
  { path: "/", heading: home.title },
  { path: "/privacidade", heading: "Política de privacidade" },
  { path: "/termos", heading: "Termos de uso" },
  { path: "/sign-in", heading: "Entrar" },
  { path: "/sign-up", heading: "Criar conta" },
  { path: "/forgot-password", heading: "Recuperar senha" },
];

for (const theme of themes) {
  for (const { path, heading } of pages) {
    test(`${path} has no accessibility violations in the ${theme} theme`, async ({ page }) => {
      await page.context().addCookies([{ name: "theme", value: theme, url: appOrigin }]);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  }
}

test("the home page leads to sign-up and sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Criar conta" }).first().click();
  await expect(page).toHaveURL("/sign-up");
  await page.goto("/");
  await page.getByRole("link", { name: "Entrar" }).first().click();
  await expect(page).toHaveURL("/sign-in");
});

test("the home arrives whole with reduced motion, and every document on it stays paper in the dark", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.context().addCookies([{ name: "theme", value: "dark", url: appOrigin }]);
  await page.goto("/");
  // Whatever the product's home stages, nothing waits halfway: every entrance is at rest at once.
  const opacities = await page
    .locator(".animate-enter, .animate-stamp, .reveal")
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).opacity));
  expect(opacities.filter((opacity) => opacity !== "1")).toEqual([]);
  const schemes = await page
    .locator("article[data-paper]")
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).colorScheme));
  expect(schemes.filter((scheme) => scheme !== "light")).toEqual([]);
});

test("an unknown address gets the not-found page with a way home", async ({ page }) => {
  const response = await page.goto("/nao-existe-mesmo");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  // Any words that lead home: a product may draw its own page, "Voltar para o início".
  await page.getByRole("link", { name: /para o início/ }).click();
  await expect(page).toHaveURL("/");
});

test("search engines are told to stay out of everything outside production", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /");
  expect(robots).not.toContain("Sitemap:");
});

test("the sitemap lists the public pages and nothing behind sign-in", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/", "/privacidade", "/termos"]) {
    expect(sitemap).toContain(`<loc>${appOrigin}${path}</loc>`);
  }
  expect(sitemap).not.toMatch(/\/(account|admin|staff|catalog)/);
});

test("the share image, the icons and the manifest exist, with an absolute image in the metadata", async ({
  page,
  request,
}) => {
  for (const path of ["/opengraph-image", "/icon", "/apple-icon"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
  const manifest = (await (await request.get("/manifest.webmanifest")).json()) as {
    name: string;
    display: string;
  };
  expect(manifest).toMatchObject({ name: site.name, display: "standalone" });

  await page.goto("/privacidade");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    new RegExp(`^${appOrigin}/opengraph-image`),
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${appOrigin}/privacidade`,
  );
});

test("a protected page sends a visitor to sign-in with the way back kept", async ({ page }) => {
  await page.goto("/account");
  expect(new URL(page.url()).pathname).toBe("/sign-in");
  expect(new URL(page.url()).searchParams.get("next")).toBe("/account");
});

test("the sign-in form says which field is missing, and what is wrong with an e-mail", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toHaveCount(1);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Preencha este campo.")).toHaveCount(2);
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("sem-arroba");
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await expect(page.getByText("Preencha este campo.")).toHaveCount(1);
});

test("a public page answers at its Portuguese address and the route address moves there", async ({
  request,
}) => {
  const plans = publicPathOf("/plans") ?? "/plans";
  const page = await request.get(plans);
  expect(page.status()).toBe(200);
  const moved = await request.get("/plans?ref=x", { maxRedirects: 0 });
  expect(moved.status()).toBe(301);
  expect(new URL(moved.headers()["location"] ?? "").pathname).toBe(plans);
  expect(new URL(moved.headers()["location"] ?? "").search).toBe("?ref=x");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/contato</loc>");
  expect(sitemap).not.toContain("/contact</loc>");
});

test("links and the canonical use the public address", async ({ page }) => {
  await page.goto("/contato");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/contato$/);
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Termos de uso" })).toHaveAttribute(
    "href",
    "/termos",
  );
});

async function structuredData(page: Page) {
  const data = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent ?? "{}")));
  return data as { "@type": string; [key: string]: unknown }[];
}

test("the home page describes the organization and its questions to search engines", async ({
  page,
}) => {
  await page.goto("/");
  const data = await structuredData(page);
  // At least these; a product may declare more of its own (what it sells, what it is).
  expect(data.map((item) => item["@type"])).toEqual(
    expect.arrayContaining(["FAQPage", "Organization", "WebSite"]),
  );
  expect(data.find((item) => item["@type"] === "Organization")?.["url"]).toBe(`${appOrigin}/`);
  // What the page shows is what it declares: every question is on screen, and opens to its answer.
  const faq = data.find((item) => item["@type"] === "FAQPage") as unknown as {
    mainEntity: { name: string; acceptedAnswer: { text: string } }[];
  };
  expect(faq.mainEntity.length).toBeGreaterThan(0);
  for (const question of faq.mainEntity) {
    // By its words: a product may draw each question as a native disclosure instead of a button.
    const trigger = page.getByText(question.name, { exact: true });
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByText(question.acceptedAnswer.text)).toBeVisible();
  }
});

// The articles are the product's: the specs read the newest one from the generated index, and their
// addresses from the path map, where a product may give them another place.
const [newest] = articles;
const articleList = publicPathOf("/articles") ?? "/articles";
const articleAt = (slug: string) => publicPathOf(`/articles/${slug}`) ?? `/articles/${slug}`;

test("a plans page declares its questions, and an article its trail", async ({ page }) => {
  test.skip(newest === undefined, "the product has no article yet");
  await page.goto(publicPathOf("/plans") ?? "/plans");
  expect((await structuredData(page)).map((item) => item["@type"])).toContain("FAQPage");
  await page.goto(articleAt(newest?.slug ?? ""));
  const kinds = (await structuredData(page)).map((item) => item["@type"]);
  expect(kinds).toContain("Article");
  expect(kinds).toContain("BreadcrumbList");
  await expect(page.getByRole("navigation", { name: "Você está aqui" })).toBeVisible();
});

test("articles list, open with their reading layout, and a missing one is a real 404", async ({
  page,
  request,
}) => {
  test.skip(newest === undefined, "the product has no article yet");
  const { slug, title } = newest ?? { slug: "", title: "" };
  await page.goto(articleList);
  await expect(page.getByRole("heading", { level: 1, name: "Artigos" })).toBeVisible();
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${articleAt(slug)}$`));
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  expect((await request.get(articleAt("nao-existe"))).status()).toBe(404);
});
