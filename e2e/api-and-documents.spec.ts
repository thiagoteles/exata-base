import { expect, type Page, test } from "@playwright/test";
import { expectAccountPage } from "./environment";

/*
 * A personal API token, as a person uses it: make one on the account page, call the API with it,
 * see that a browser from an unlisted origin is not let in, and revoke it. The same file holds what a
 * visitor can and cannot do with a document address, since both are doors for programs and printouts.
 */

const NO_TOKENS = "the product's account page has no API keys";

/** True when the account page, drawn by the product, leaves the API keys out. */
async function hasNoTokens(page: Page) {
  await expectAccountPage(page);
  await page.waitForLoadState("networkidle");
  return (await page.getByRole("textbox", { name: "Nome da chave", exact: true }).count()) === 0;
}

test("a token opens the API until it is revoked", async ({ page, request }) => {
  await page.goto("/account");
  test.skip(await hasNoTokens(page), NO_TOKENS);
  await page.getByRole("textbox", { name: "Nome da chave", exact: true }).fill("Planilha");
  await page.getByRole("button", { name: "Criar chave" }).click();
  const shown = page.getByText(/^exb_[A-Za-z0-9_-]{30,}$/);
  await expect(shown).toBeVisible();
  const token = (await shown.textContent()) ?? "";

  const me = await request.get("/api/v1/me", { headers: { Authorization: `Bearer ${token}` } });
  expect(me.status()).toBe(200);
  expect(await me.json()).toMatchObject({ email: "admin@app.local" });
  expect(me.headers()["cache-control"]).toBe("no-store");
  expect(me.headers()["access-control-allow-origin"]).toBeUndefined();

  const foreign = await request.get("/api/v1/me", {
    headers: { Authorization: `Bearer ${token}`, Origin: "https://evil.example" },
  });
  expect(foreign.headers()["access-control-allow-origin"]).toBeUndefined();

  const anonymous = await request.get("/api/v1/me");
  expect(anonymous.status()).toBe(401);
  expect((await anonymous.json()).error).toMatchObject({ status: 401, key: "unauthorized" });

  // The list is drawn again once the key is made, so the row is found by this key's own prefix and
  // the click waits for it; a click on the row being replaced is lost.
  const row = page.getByRole("listitem").filter({ hasText: `Planilha${token.slice(0, 8)}` });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Revogar" }).click();
  await expect(row).toHaveCount(0);
  await expect
    .poll(async () =>
      (await request.get("/api/v1/me", { headers: { Authorization: `Bearer ${token}` } })).status(),
    )
    .toBe(401);
});

test("a token writes only with the scope that allows it, and only a valid body", async ({
  page,
  request,
}) => {
  await page.goto("/account");
  test.skip(await hasNoTokens(page), NO_TOKENS);
  const make = async (name: string, write: boolean) => {
    await page.goto("/account");
    await page.getByRole("textbox", { name: "Nome da chave", exact: true }).fill(name);
    const writing = page.getByRole("checkbox", { name: "Trocar o nome do seu perfil" });
    await expect(writing).not.toBeChecked();
    if (write) {
      await writing.check();
    }
    await page.getByRole("button", { name: "Criar chave" }).click();
    const shown = page.getByText(/^exb_[A-Za-z0-9_-]{30,}$/);
    await expect(shown).toBeVisible();
    return { Authorization: `Bearer ${(await shown.textContent()) ?? ""}` };
  };
  const reader = await make("Só leitura", false);
  const writer = await make("Escrita", true);

  const refused = await request.patch("/api/v1/me", { headers: reader, data: { name: "X" } });
  expect(refused.status()).toBe(403);
  const invalid = await request.patch("/api/v1/me", { headers: writer, data: { name: "" } });
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error).toMatchObject({ status: 400, key: "badRequest" });

  const renamed = await request.patch("/api/v1/me", {
    headers: writer,
    data: { name: "Admin pela API" },
  });
  expect(renamed.status()).toBe(200);
  expect(await renamed.json()).toMatchObject({ name: "Admin pela API" });
  const me = await request.get("/api/v1/me", { headers: writer });
  expect(await me.json()).toMatchObject({ name: "Admin pela API" });
  await request.patch("/api/v1/me", { headers: writer, data: { name: "Admin" } });

  // A person holds at most ten keys, and every run of this spec signs in as the same admin.
  await page.goto("/account");
  for (const name of ["Escrita", "Só leitura"]) {
    const keys = page.getByRole("listitem").filter({ hasText: new RegExp(`^${name}\\s*exb_`) });
    // The list streams in after the page; counting before it arrives would count nothing.
    await expect(keys.first()).toBeVisible();
    const held = await keys.count();
    await keys.first().getByRole("button", { name: "Revogar" }).click();
    await expect(keys).toHaveCount(held - 1);
  }
});

test("an address nobody signed is no verification page, and a receipt is never someone else's", async ({
  page,
  request,
}) => {
  const forged = await page.goto("/verificar/forjado.assinatura");
  expect(forged?.status()).toBe(404);
  const receipt = await request.get("/account/receipts/0c6f5c1e-3f4a-4a56-9f0e-8a1d7e5b2c31");
  expect(receipt.status()).toBe(404);
  const notAnId = await request.get("/account/receipts/not-an-id");
  expect(notAnId.status()).toBe(404);
});
