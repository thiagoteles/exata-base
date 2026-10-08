import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  sessions: [] as Record<string, unknown>[],
  cancel: vi.fn(),
}));

vi.mock("stripe", () => {
  class StripeInvalidRequestError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  const Stripe = Object.assign(
    vi.fn(function client() {
      return {
        checkout: {
          sessions: {
            create: (params: Record<string, unknown>) => {
              calls.sessions.push(params);
              return Promise.resolve({ url: "https://pay.example/session" });
            },
          },
        },
        subscriptions: { cancel: calls.cancel },
      };
    }),
    { errors: { StripeInvalidRequestError } },
  );
  return { default: Stripe };
});

const { createStripeGateway } = await import("./stripe");
const gateway = createStripeGateway({ secretKey: "sk_test_x", webhookSecret: "whsec_x" });
const base = {
  userId: "user-1",
  email: "ana@example.com",
  priceId: "price_1",
  successUrl: "https://app.example/ok",
  cancelUrl: "https://app.example/no",
};

beforeEach(() => {
  calls.sessions.length = 0;
  calls.cancel.mockReset();
});

describe("creating a checkout", () => {
  it("takes a one-off payment for the lifetime plan and always creates the customer", async () => {
    const url = await gateway.createCheckout({ ...base, customerId: null, interval: "lifetime" });
    expect(url).toBe("https://pay.example/session");
    expect(calls.sessions[0]).toMatchObject({
      mode: "payment",
      customer_creation: "always",
      customer_email: "ana@example.com",
      client_reference_id: "user-1",
      metadata: { interval: "lifetime" },
    });
  });

  it("starts a subscription for a monthly or yearly plan", async () => {
    await gateway.createCheckout({ ...base, customerId: null, interval: "yearly" });
    expect(calls.sessions[0]).toMatchObject({
      mode: "subscription",
      metadata: { interval: "yearly" },
    });
    expect(calls.sessions[0]).not.toHaveProperty("customer_creation");
  });

  it("reuses the customer the person already has", async () => {
    await gateway.createCheckout({ ...base, customerId: "cus_9", interval: "monthly" });
    expect(calls.sessions[0]).toMatchObject({ customer: "cus_9" });
    expect(calls.sessions[0]).not.toHaveProperty("customer_email");
  });
});

describe("ending a subscription", () => {
  it("ends it at once with no credit for the unused time", async () => {
    calls.cancel.mockResolvedValue({});
    await gateway.cancelSubscription("sub_1");
    expect(calls.cancel).toHaveBeenCalledWith("sub_1", { prorate: false });
  });

  it("treats a subscription that is already gone as ended, and lets other failures through", async () => {
    const { default: Stripe } = await import("stripe");
    calls.cancel.mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError("resource_missing" as never),
    );
    await expect(gateway.cancelSubscription("sub_1")).resolves.toBeUndefined();
    calls.cancel.mockRejectedValueOnce(new Error("network"));
    await expect(gateway.cancelSubscription("sub_1")).rejects.toThrow("network");
  });
});
