import { expect, test } from "@playwright/test";

/*
 * A personal API token, as a person uses it: make one on the account page, call the API with it,
 * see that a browser from an unlisted origin is not let in, and revoke it. The same file holds what a
 * visitor can and cannot do with a document address, since both are doors for programs and printouts.
 */

test("a token opens the API until it is revoked", async ({ page, request }) => {
  await page.goto("/account");
  await page.getByLabel("Nome da chave").fill("Planilha");
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

  await page
    .getByRole("listitem")
    .filter({ hasText: "Planilha" })
    .last()
    .getByRole("button", { name: "Revogar" })
    .click();
  await expect
    .poll(async () =>
      (await request.get("/api/v1/me", { headers: { Authorization: `Bearer ${token}` } })).status(),
    )
    .toBe(401);
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
