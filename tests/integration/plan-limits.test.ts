import { describe, expect, it } from "vitest";
import { consumeLimit } from "@/lib/billing/limits";
import { billingFixture } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const now = new Date("2026-06-01T12:00:10Z");
const holder = (id: string) => ({ kind: "user", id }) as const;

describe("what a plan allows in a window", () => {
  it("lets a free account spend its allowance and refuses the next use, with when to try again", async () => {
    const ana = await createUser(db, "ana@example.com");
    for (let use = 0; use < 5; use += 1) {
      expect((await consumeLimit(db, holder(ana.id), "exports", now)).allowed).toBe(true);
    }
    const refused = await consumeLimit(db, holder(ana.id), "exports", now);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
    expect(refused.retryAfterSeconds).toBeLessThanOrEqual(86_400);
  });

  it("counts each person apart, and starts over in the next window", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    for (let use = 0; use < 6; use += 1) {
      await consumeLimit(db, holder(ana.id), "exports", now);
    }
    expect((await consumeLimit(db, holder(ana.id), "exports", now)).allowed).toBe(false);
    expect((await consumeLimit(db, holder(bia.id), "exports", now)).allowed).toBe(true);
    const tomorrow = new Date(now.getTime() + 86_400_000);
    expect((await consumeLimit(db, holder(ana.id), "exports", tomorrow)).allowed).toBe(true);
  });

  it("gives a paid plan the larger allowance, from the same counter", async () => {
    const { subscriber } = billingFixture(db);
    const paying = await subscriber("paga@example.com");
    const decisions = await Promise.all(
      Array.from({ length: 60 }, () => consumeLimit(db, holder(paying.id), "exports", now)),
    );
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(50);
  });

  it("lets exactly the allowance through when the uses arrive at the same time", async () => {
    const ana = await createUser(db, "ana@example.com");
    const decisions = await Promise.all(
      Array.from({ length: 12 }, () => consumeLimit(db, holder(ana.id), "exports", now)),
    );
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(5);
  });

  it("is no limit at all for a name the plan does not meter", async () => {
    const ana = await createUser(db, "ana@example.com");
    // @ts-expect-error a limit no tier names does not type-check; at run time it is unlimited
    const decision = await consumeLimit(db, holder(ana.id), "not-a-limit", now);
    expect(decision).toMatchObject({ allowed: true });
    expect(decision.remaining).toBe(Number.POSITIVE_INFINITY);
  });
});
