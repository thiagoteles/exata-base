import { expect, type Page, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { linkSentTo } from "./mail";

/*
 * The whole life of an account, as one person lives it: sign up, confirm the e-mail from the
 * inbox, choose a theme, download the data, sign out, fail to sign in, sign in, and delete the
 * account. It runs as one serial story because each step needs the one before it.
 */

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

const email = `ana-${Date.now()}@example.com`;
const password = "uma-senha-bem-longa";

test("sign up asks for the e-mail to be confirmed, and the link signs the person in", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page.getByLabel("Nome", { exact: true }).fill("Ana Souza");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText(`Enviamos um link de confirmação para ${email}`)).toBeVisible();

  // Until the link is followed, the password does not open the door.
  await openSignIn(page);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Confirme seu e-mail antes de entrar.")).toBeVisible();

  await page.goto(await linkSentTo(email));
  await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
});

test("the theme is applied at once, kept on reload, and saved in the account", async ({ page }) => {
  await signIn(page);
  // The theme is applied in the browser at once and saved by an action; reloading before the
  // action answers would cancel the save, so the test waits for the answer.
  const saved = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().endsWith("/account"),
  );
  await page.getByRole("radio", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await saved;

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "Escuro" })).toBeChecked();

  // The saved choice follows the person to a browser that has no cookie yet.
  await page.context().clearCookies({ name: "theme" });
  await page.goto("/auth/complete?next=%2Faccount");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const forgotten = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().endsWith("/account"),
  );
  await page.getByRole("radio", { name: "Do sistema" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  await forgotten;
});

test("the data export is a ZIP with the person's own data", async ({ page }) => {
  await signIn(page);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Baixar meus dados" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^dados-.*\.zip$/);
  const path = await file.path();
  const { readFileSync } = await import("node:fs");
  const zip = unzipSync(new Uint8Array(readFileSync(path)));
  const data = JSON.parse(new TextDecoder().decode(zip["data.json"])) as {
    user: { email: string }[];
    version: number;
  };
  expect(data.version).toBe(1);
  expect(data.user.map((row) => row.email)).toEqual([email]);
});

test("signing out ends the session, and a wrong password is refused with a clear message", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/account");
  expect(new URL(page.url()).pathname).toBe("/sign-in");
  await signInScreenReady(page);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});

test("a way back that leaves the site is ignored after signing in", async ({ page }) => {
  await openSignIn(page, `?next=${encodeURIComponent("https://evil.test/roubo")}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.origin === "http://localhost:3300" && url.pathname === "/");
  expect(new URL(page.url()).host).toBe("localhost:3300");
});

test("deleting the account asks first, signs the person out and closes the door for good", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: "Apagar minha conta" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Apagar sua conta?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();

  await page.getByRole("button", { name: "Apagar minha conta" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Apagar minha conta" }).click();
  await expect(page).toHaveURL("/");

  await openSignIn(page);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});

/**
 * Waits until the sign-in screen is whole. It streams in behind Suspense, so for a moment the
 * document holds the client's form and the server's still-hidden copy; only the first is visible.
 */
async function signInScreenReady(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toHaveCount(1);
  await settled(page);
}

async function openSignIn(page: Page, query = "") {
  await page.goto(`/sign-in${query}`);
  await signInScreenReady(page);
}

/** A click before hydration finds the button but not its handler; waiting for the network to idle avoids it. */
async function settled(page: Page) {
  await page.waitForLoadState("networkidle");
}

async function signIn(page: Page) {
  await openSignIn(page, "?next=%2Faccount");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
  await settled(page);
}
