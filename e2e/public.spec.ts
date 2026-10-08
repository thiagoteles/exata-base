import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const themes = ["light", "dark"] as const;

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
  );
}

const pages = [
  { path: "/", heading: "O dia a dia organizado, sem enfeite" },
  { path: "/privacy", heading: "Política de privacidade" },
  { path: "/terms", heading: "Termos de uso" },
  { path: "/sign-in", heading: "Entrar" },
  { path: "/sign-up", heading: "Criar conta" },
  { path: "/forgot-password", heading: "Recuperar senha" },
];

for (const theme of themes) {
  for (const { path, heading } of pages) {
    test(`${path} has no accessibility violations in the ${theme} theme`, async ({ page }) => {
      await page
        .context()
        .addCookies([{ name: "theme", value: theme, url: "http://localhost:3300" }]);
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

test("an unknown address gets the not-found page with a way home", async ({ page }) => {
  const response = await page.goto("/nao-existe-mesmo");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  await page.getByRole("link", { name: "Ir para o início" }).click();
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
  for (const path of ["/", "/privacy", "/terms"]) {
    expect(sitemap).toContain(`<loc>http://localhost:3300${path}</loc>`);
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
  expect(manifest).toMatchObject({ name: "Meu produto", display: "standalone" });

  await page.goto("/privacy");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /^http:\/\/localhost:3300\/opengraph-image/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3300/privacy",
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
  await expect(page.getByLabel("E-mail")).toHaveCount(1);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Preencha este campo.")).toHaveCount(2);
  await page.getByLabel("E-mail").fill("sem-arroba");
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await expect(page.getByText("Preencha este campo.")).toHaveCount(1);
});
