import { type APIRequestContext, expect, type Page } from "@playwright/test";

/*
 * The suite is written for the plain compose: no payment provider and a seeded admin on the free
 * plan. A developer who tries a provider with real keys, or buys a plan by hand, changes that
 * state and the database keeps it. A test that depends on the plain state asks first and skips
 * with the reason, instead of failing for something the app did right.
 */

/** True while the payment provider is off: its webhook answers 404 to anything. */
export async function billingIsOff(request: APIRequestContext) {
  const probe = await request.post("/api/webhooks/stripe", {
    data: "{}",
    headers: { "stripe-signature": "t=1,v1=00" },
  });
  return probe.status() === 404;
}

/** True while the signed-in account has no paid plan and no courtesy. */
export async function accountIsFree(page: Page) {
  await page.goto("/account/plan");
  await expect(page.getByRole("heading", { level: 1, name: "Meu plano" })).toBeVisible();
  return (await page.getByText("Gratuito", { exact: true }).count()) > 0;
}

export const BILLING_ON = "billing is on, the test is for a product without a payment provider";
export const PLAN_PAID = "the account has a plan, the test is for the free plan";
