import { expect, test } from "@playwright/test";
import { newPerson, signInAs, signUpAndConfirm } from "./person";

/*
 * What a person sets for how the page looks and what they leave half done, on an account of their
 * own: the page script reads the cookies before the first paint, the account keeps the choices for
 * another browser, and a visitor's draft is handed over at sign-in. One serial story, because each
 * step needs the account the one before it made.
 */

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

const person = newPerson("pref");

async function settled(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
}

test("the account is made and confirmed from the inbox", async ({ page }) => {
  await signUpAndConfirm(page, person);
});

test("text size, motion and contrast apply at once, are kept on reload, and can be put back", async ({
  page,
}) => {
  await signInAs(page, person);
  const root = page.locator("html");
  const saved = () =>
    page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().endsWith("/account"),
    );
  const mutedInk = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-ink-muted").trim(),
    );
  const rootSize = () =>
    page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
  const standardInk = await mutedInk();
  expect(await rootSize()).toBe(16);

  // Larger text scales the root, so everything written in rem follows.
  let answer = saved();
  await page.getByRole("radio", { name: "Maior" }).click();
  await expect(root).toHaveAttribute("data-font-scale", "larger");
  expect(await rootSize()).toBe(20);
  await answer;

  // Reduced motion and stronger contrast set their own attributes, and the contrast really
  // changes a color.
  answer = saved();
  await page.getByRole("radio", { name: "Reduzir" }).click();
  await expect(root).toHaveAttribute("data-motion", "reduce");
  await answer;
  answer = saved();
  await page.getByRole("radio", { name: "Reforçado" }).click();
  await expect(root).toHaveAttribute("data-contrast", "more");
  await answer;
  expect(await mutedInk()).not.toBe(standardInk);

  // All three are on the page before it paints, from the cookies, after a reload.
  await page.reload();
  await expect(root).toHaveAttribute("data-font-scale", "larger");
  await expect(root).toHaveAttribute("data-motion", "reduce");
  await expect(root).toHaveAttribute("data-contrast", "more");
  await expect(page.getByRole("radio", { name: "Maior" })).toBeChecked();

  // And they follow the person to a browser with no cookies.
  for (const name of ["font-scale", "motion", "contrast"]) {
    await page.context().clearCookies({ name });
  }
  await page.goto("/auth/complete?next=%2Faccount");
  await expect(root).toHaveAttribute("data-font-scale", "larger");
  await expect(root).toHaveAttribute("data-motion", "reduce");
  await expect(root).toHaveAttribute("data-contrast", "more");

  // Put back, one row at a time: the attributes go and the root returns to its size and color.
  for (const [group, label] of [
    ["Tamanho do texto", "Padrão"],
    ["Movimento", "Do sistema"],
    ["Contraste", "Do sistema"],
  ] as const) {
    answer = saved();
    await page.getByRole("radiogroup", { name: group }).getByRole("radio", { name: label }).click();
    await answer;
  }
  await expect(root).not.toHaveAttribute("data-font-scale", /.+/);
  await expect(root).not.toHaveAttribute("data-motion", /.+/);
  await expect(root).not.toHaveAttribute("data-contrast", /.+/);
  expect(await rootSize()).toBe(16);
  expect(await mutedInk()).toBe(standardInk);
});

test("a system that asks for more contrast gets it, with no choice made", async ({ page }) => {
  await page.emulateMedia({ contrast: "more" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "more");
});

test("a draft written as a visitor is kept, handed to the account at sign-in, and forgotten by the browser", async ({
  page,
}) => {
  const draftText = "Quero entender como funciona o meu plano e o que ele inclui.";
  const held = () => page.evaluate(() => localStorage.getItem("visitor:contactDraft"));

  // A visitor starts writing and leaves. The draft stays in this browser, not in a cookie.
  await page.goto("/contato");
  await settled(page);
  await page.getByLabel("Mensagem").fill(draftText);
  await expect.poll(held, { timeout: 15_000 }).toContain(draftText);
  expect((await page.context().cookies()).some((cookie) => cookie.value.includes("plano"))).toBe(
    false,
  );
  await page.reload();
  await settled(page);
  await expect(page.getByLabel("Mensagem")).toHaveValue(draftText);

  // Signing in hands it to the account, and this browser forgets it.
  await signInAs(page, person);
  await expect.poll(held, { timeout: 30_000 }).toBeNull();

  // The account has it now: it is waiting in the form, with the person's name, whatever the browser.
  await page.goto("/contato");
  await settled(page);
  await expect(page.getByLabel("Mensagem")).toHaveValue(draftText);
  expect(await held()).toBeNull();

  // Sending the message clears the draft for good.
  await page.getByRole("combobox", { name: "Assunto" }).click();
  await page.getByRole("option", { name: "Suporte" }).click();
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada")).toBeVisible();
  await page.goto("/contato");
  await settled(page);
  await expect(page.getByLabel("Mensagem")).toHaveValue("");
});
