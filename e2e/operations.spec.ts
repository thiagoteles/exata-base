import { expect, test } from "@playwright/test";

/* The two open endpoints that exist for operations: the browser error report. */

test.use({ storageState: { cookies: [], origins: [] } });

test("the browser error route takes a small report and refuses the rest", async ({ request }) => {
  const report = { source: "page", message: `e2e ${Date.now()}`, path: "/account" };
  expect((await request.post("/api/client-errors", { data: report })).status()).toBe(204);
  expect(
    (await request.post("/api/client-errors", { data: { ...report, extra: true } })).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/client-errors", { data: { ...report, stack: "x".repeat(9000) } })
    ).status(),
  ).toBe(413);
  expect((await request.get("/api/client-errors")).status()).toBe(405);
});
