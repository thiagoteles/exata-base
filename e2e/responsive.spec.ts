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

test("on a phone the sidebar becomes a bottom bar of 64px with the destinations as large targets", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
  const bar = page.getByRole("navigation", { name: "Navegação principal do celular" });
  await expect(bar).toBeVisible();
  // The bar's destinations are the product's first ones, whatever they are: each is a 64px target.
  const links = bar.getByRole("link");
  expect(await links.count()).toBeGreaterThan(0);
  for (const box of await links.evaluateAll((all) =>
    all.map((link) => link.getBoundingClientRect().height),
  )) {
    expect(box).toBe(64);
  }
  await expect(page.getByRole("navigation", { name: "Navegação da área logada" })).toBeHidden();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
