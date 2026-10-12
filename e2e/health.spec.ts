import { expect, test } from "@playwright/test";

const uuid = /^[0-9a-f-]{36}$/;

test("the app answers and reaches Postgres", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("every response carries a request id", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.headers()["x-request-id"]).toMatch(uuid);
});
