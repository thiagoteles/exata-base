import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";
import { z } from "@/lib/validation";

const session = vi.hoisted(() => ({ role: null as null | "member" | "staff" | "admin" }));
const limits = vi.hoisted(() => ({ over: false, subjects: [] as string[] }));
const plan = vi.hoisted(() => ({ granted: true, asked: [] as string[] }));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ "x-request-id": "req-1" })),
}));
vi.mock("@/lib/ports/auth", async () => {
  const { hasRole } = await import("@/lib/accounts/roles");
  return {
    requireRole: (minimum: "member" | "staff" | "admin") => {
      if (session.role === null) {
        return Promise.reject(new DomainError(401));
      }
      if (!hasRole(session.role, minimum)) {
        return Promise.reject(new DomainError(403));
      }
      return Promise.resolve({
        id: "u1",
        email: "a@b.c",
        name: "A",
        role: session.role,
        options: {},
      });
    },
  };
});

vi.mock("@/lib/rate-limit/guard", async () => {
  const { DomainError: Refusal } = await import("@/lib/errors");
  return {
    requestAddressSubject: () => Promise.resolve("address:203.0.113.9"),
    enforceRateLimit: (_rule: unknown, subject: string) => {
      limits.subjects.push(subject);
      return limits.over ? Promise.reject(new Refusal(429)) : Promise.resolve();
    },
  };
});

vi.mock("@/lib/billing/guard", async () => {
  const { DomainError: Refusal } = await import("@/lib/errors");
  return {
    assertFeature: (holderId: string, feature: string) => {
      plan.asked.push(`${holderId}:${feature}`);
      return plan.granted
        ? Promise.resolve()
        : Promise.reject(new Refusal(403, "paidPlanRequired"));
    },
  };
});

const { actionFor, limitedPublicAction } = await import("./client");

const premiumOnly = actionFor("member", { feature: "premium" }).action(() =>
  Promise.resolve({ done: true }),
);

const limited = actionFor("member", {
  rateLimit: { name: "test", limit: 1, windowSeconds: 60 },
}).action(() => Promise.resolve({ done: true }));
const visitorForm = limitedPublicAction({ name: "form", limit: 1, windowSeconds: 60 }).action(() =>
  Promise.resolve({ done: true }),
);

const staffEcho = actionFor("staff")
  .inputSchema(z.object({ note: z.string().min(3) }))
  .action(({ ctx, parsedInput }) => Promise.resolve({ by: ctx.user.id, note: parsedInput.note }));
const failing = actionFor("member").action(() =>
  Promise.reject(new Error("database password leaked")),
);

beforeEach(() => {
  session.role = null;
  limits.over = false;
  limits.subjects.length = 0;
  plan.granted = true;
  plan.asked.length = 0;
});

describe("server actions", () => {
  it("refuse a visitor who is not signed in, in the domain error shape", async () => {
    expect((await staffEcho({ note: "oi!" }))?.serverError).toEqual({
      status: 401,
      key: "unauthorized",
      requestId: "req-1",
    });
  });

  it("refuse a role below the action's minimum, and accept one above it", async () => {
    session.role = "member";
    expect((await staffEcho({ note: "oi!" }))?.serverError).toMatchObject({
      status: 403,
      key: "forbidden",
    });
    session.role = "admin";
    expect((await staffEcho({ note: "oi!" }))?.data).toEqual({ by: "u1", note: "oi!" });
  });

  it("return field errors as catalog keys before running the action", async () => {
    session.role = "staff";
    const result = await staffEcho({ note: "x" });
    expect(result?.data).toBeUndefined();
    expect(JSON.parse(result?.validationErrors?.fieldErrors.note?.[0] ?? "{}")).toEqual({
      key: "tooShort",
      values: { minimum: 3 },
    });
  });

  it("count a signed-in person by id and a visitor by address, and refuse over the limit", async () => {
    session.role = "member";
    expect((await limited())?.data).toEqual({ done: true });
    expect((await visitorForm())?.data).toEqual({ done: true });
    expect(limits.subjects).toEqual(["user:u1", "address:203.0.113.9"]);
    limits.over = true;
    expect((await limited())?.serverError).toMatchObject({ status: 429, key: "tooManyRequests" });
    expect((await visitorForm())?.serverError).toMatchObject({ status: 429 });
  });

  it("check the role before counting, so a refused visitor never spends the limit", async () => {
    expect((await limited())?.serverError).toMatchObject({ status: 401 });
    expect(limits.subjects).toEqual([]);
  });

  it("ask the plan for the feature after the role, and refuse when it is not granted", async () => {
    expect((await premiumOnly())?.serverError).toMatchObject({ status: 401 });
    expect(plan.asked).toEqual([]);
    session.role = "member";
    expect((await premiumOnly())?.data).toEqual({ done: true });
    plan.granted = false;
    expect((await premiumOnly())?.serverError).toMatchObject({
      status: 403,
      key: "paidPlanRequired",
    });
    expect(plan.asked).toEqual(["u1:premium", "u1:premium"]);
  });

  it("never expose an unexpected error", async () => {
    session.role = "member";
    expect((await failing())?.serverError).toEqual({
      status: 500,
      key: "internal",
      requestId: "req-1",
    });
  });
});
