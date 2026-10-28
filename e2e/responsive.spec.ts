import { expect, test } from "@playwright/test";
import { appOrigin } from "./origin";

test("on a phone the list becomes two-line blocks and nothing scrolls sideways", async ({
  page,
}) => {
  await page.context().addCookies([{ name: "theme", value: "light", url: appOrigin }]);
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("columnheader", { name: "Cliente" })).toBeHidden();
});

test("on a phone the header folds three actions into one menu", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("button", { name: "Mais ações" }).click();
  await expect(page.getByRole("menuitem")).toHaveCount(3);
});

test("on a phone the sidebar becomes a bottom bar with the destinations as large targets", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const bar = page.getByRole("navigation", { name: "Navegação principal do celular" });
  await expect(bar).toBeVisible();
  // The bar's destinations are the product's first ones, whatever they are. The base's bar makes
  // each a 64px target; a product's own bar keeps its own height, never under the 44px minimum.
  const links = bar.getByRole("link");
  expect(await links.count()).toBeGreaterThan(0);
  const baseBar = (await page.locator("[data-base-bar]").count()) > 0;
  for (const box of await links.evaluateAll((all) =>
    all.map((link) => link.getBoundingClientRect().height),
  )) {
    if (baseBar) {
      expect(box).toBe(64);
    } else {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  }
  await expect(page.getByRole("navigation", { name: "Navegação da área logada" })).toBeHidden();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
