import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const themes = ["light", "dark"] as const;

test("on a wide screen the sidebar shows the current destination and the bottom bar is gone", async ({
  page,
}) => {
  await page.goto("/account");
  const sidebar = page.getByRole("navigation", { name: "Navegação da área logada" });
  await expect(sidebar.getByRole("link", { name: "Minha conta" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect((await sidebar.boundingBox())?.width).toBeGreaterThanOrEqual(240);
  await expect(
    page.getByRole("navigation", { name: "Navegação principal do celular" }),
  ).toBeHidden();
  const header = await page.locator("header").first().boundingBox();
  expect(header?.height).toBe(60);
});

test("only the content scrolls: the top bar stays where it is", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
  const before = await page.locator("header").first().boundingBox();
  await page.locator("main").evaluate((element) => element.scrollTo(0, 1200));
  const after = await page.locator("header").first().boundingBox();
  expect(after?.y).toBe(before?.y);
});

test("the skip link jumps over the navigation to the content", async ({ page }) => {
  await page.goto("/account");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Ir para o conteúdo" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("main")).toBeInViewport();
});

for (const theme of themes) {
  test(`the account page has no accessibility violations in the ${theme} theme`, async ({
    page,
  }) => {
    await page
      .context()
      .addCookies([{ name: "theme", value: theme, url: "http://localhost:47300" }]);
    await page.goto("/account");
    await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
      ),
    ).toEqual([]);
  });
}
