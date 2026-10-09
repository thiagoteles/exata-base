import { describe, expect, it } from "vitest";
import { purgeRateLimits } from "@/lib/daily/purge-rate-limits";
import { rateLimits } from "@/lib/db/schema/rate-limits";
import { consume } from "@/lib/rate-limit/service";
import { testDatabase } from "./database";

const db = testDatabase();
const rule = { name: "form", limit: 5, windowSeconds: 60 };
const now = new Date("2026-06-01T12:00:10Z");

describe("rate limit", () => {
  it("lets exactly the limit through when the calls arrive at the same time", async () => {
    const decisions = await Promise.all(
      Array.from({ length: 10 }, () => consume(db, rule, "address:203.0.113.9", now)),
    );
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(5);
    expect(decisions.find((decision) => !decision.allowed)?.retryAfterSeconds).toBe(50);
  });

  it("keeps subjects and limits apart, and starts over in the next window", async () => {
    for (let hit = 0; hit < 5; hit += 1) {
      await consume(db, rule, "user:a", now);
    }
    expect((await consume(db, rule, "user:a", now)).allowed).toBe(false);
    expect((await consume(db, rule, "user:b", now)).allowed).toBe(true);
    expect((await consume(db, { ...rule, name: "other" }, "user:a", now)).allowed).toBe(true);
    const nextWindow = new Date(now.getTime() + 60_000);
    expect(await consume(db, rule, "user:a", nextWindow)).toMatchObject({
      allowed: true,
      remaining: 4,
    });
  });

  it("never stores the subject itself", async () => {
    await consume(db, rule, "address:203.0.113.9", now);
    expect(JSON.stringify(await db.select().from(rateLimits))).not.toContain("203.0.113.9");
  });

  it("is purged by the daily call once the window has ended", async () => {
    await consume(db, rule, "user:a", now);
    const later = new Date(now.getTime() + 120_000);
    await consume(db, rule, "user:b", later);
    expect(await purgeRateLimits.run({ db, now: later })).toEqual({ removed: 1 });
    expect(await purgeRateLimits.run({ db, now: later })).toEqual({ removed: 0 });
  });
});
