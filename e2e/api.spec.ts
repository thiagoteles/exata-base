import { expect, test } from "@playwright/test";

/*
 * A personal API token, as a person uses it: make one on the account page, call the API with it,
 * see that a browser from an unlisted origin is not let in, and revoke it.
 */

test("a token opens the API until it is revoked", async ({ page, request }) => {
  await page.goto("/account");
  await page.getByLabel("Nome da chave").fill("Planilha");
  await page.getByRole("button", { name: "Criar chave" }).click();
  const shown = page.getByText(/^exb_/);
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

  const row = page.getByRole("listitem").filter({ hasText: "Planilha" });
  await row.getByRole("button", { name: "Revogar" }).click();
  await expect(row).toHaveCount(0);
  const revoked = await request.get("/api/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(revoked.status()).toBe(401);
});
