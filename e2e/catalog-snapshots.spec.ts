import { readFileSync } from "node:fs";
import process from "node:process";
import { expect, type Page, test } from "@playwright/test";

/*
 * The living catalog as pictures: every section, in both themes, and a few representative ones at
 * each density, compared against references kept in the repository. Presets do not switch while the
 * app runs, so the references are per preset: this suite checks the active one, and
 * `pnpm catalog:presets` visits the others.
 */

const preset =
  process.env["CATALOG_PRESET"] ??
  (JSON.parse(readFileSync("design.json", "utf8")) as { preset: string }).preset;

// Tall enough that the largest section fits in the window: the app scrolls inside its own frame, so a
// section taller than the window would be cut.
test.use({ viewport: { width: 1280, height: 3200 } });

const densities = ["medium", "comfortable", "large"] as const;
const densityRepresentatives = ["buttons", "fields", "list", "record"];

async function open(page: Page, theme: "light" | "dark") {
  await page.context().addCookies([{ name: "theme", value: theme, url: "http://localhost:47300" }]);
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  // The development server's own badge is not the product, and it moves from run to run.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.evaluate(() => document.fonts.ready);
  // Bars that stay on screen as the page scrolls would cover the top or bottom of a section.
  await page.evaluate(() => {
    for (const element of document.body.querySelectorAll<HTMLElement>("*")) {
      const { position } = getComputedStyle(element);
      if (
        (position === "fixed" || position === "sticky") &&
        !element.closest("[data-catalog-section]")
      ) {
        element.style.visibility = "hidden";
      }
    }
  });
}

async function names(page: Page, only?: readonly string[]) {
  const all = await page
    .locator("[data-catalog-section]:not([data-snapshot='skip'])")
    .evaluateAll((sections) =>
      sections.map((section) => section.getAttribute("data-catalog-section") ?? ""),
    );
  return only === undefined ? all : all.filter((name) => only.includes(name));
}

for (const theme of ["light", "dark"] as const) {
  test(`every section of the catalog looks as it did, ${theme} theme, ${preset} preset`, async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await open(page, theme);
    const sections = await names(page);
    expect(sections.length).toBeGreaterThan(10);
    for (const name of sections) {
      const section = page.locator(`[data-catalog-section="${name}"]`);
      await section.scrollIntoViewIfNeeded();
      await expect.soft(section).toHaveScreenshot(`${preset}/${theme}/${name}.png`);
    }
  });
}

for (const density of densities) {
  test(`the main sections at the ${density} density, ${preset} preset`, async ({ page }) => {
    test.setTimeout(300_000);
    await open(page, "light");
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-density", value),
      density,
    );
    for (const name of await names(page, densityRepresentatives)) {
      const section = page.locator(`[data-catalog-section="${name}"]`);
      await section.scrollIntoViewIfNeeded();
      await expect.soft(section).toHaveScreenshot(`${preset}/density-${density}/${name}.png`);
    }
  });
}
