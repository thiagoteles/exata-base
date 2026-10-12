import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  authenticateApiToken,
  createApiToken,
  listApiTokens,
  revokeApiToken,
} from "@/lib/api/tokens";
import { apiTokens } from "@/lib/db/schema/api-tokens";
import { DomainError } from "@/lib/errors";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const now = new Date("2026-10-09T12:00:00Z");
const DAY = 86_400_000;

const statusOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 200;
  } catch (error) {
    return error instanceof DomainError ? error.status : 500;
  }
};

async function tokenFor(email: string, expiresAt: Date | null = null) {
  const user = await createUser(db, email);
  const made = await createApiToken(db, user.id, {
    name: "ci",
    scopes: ["profile:read"],
    expiresAt,
  });
  return { user, ...made };
}

describe("a personal API token", () => {
  it("stands for the person who made it", async () => {
    const { user, token } = await tokenFor("ana@example.com");
    const caller = await authenticateApiToken(db, token, "profile:read", now);
    expect(caller).toMatchObject({ userId: user.id, scopes: ["profile:read"] });
  });

  it("is kept only as a hash, with the start of it visible for the list", async () => {
    const { token, id } = await tokenFor("ana@example.com");
    const [row] = await db.select().from(apiTokens).where(eq(apiTokens.id, id));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row?.prefix).toBe(token.slice(0, 8));
    expect(token.startsWith("exb_")).toBe(true);
  });

  it("is refused when unknown, missing, revoked or expired, all with the same 401", async () => {
    const live = await tokenFor("ana@example.com");
    const expiring = await tokenFor("bia@example.com", new Date(now.getTime() + DAY));
    expect(await statusOf(authenticateApiToken(db, null, "profile:read", now))).toBe(401);
    expect(await statusOf(authenticateApiToken(db, "exb_nope", "profile:read", now))).toBe(401);
    expect(
      await statusOf(
        authenticateApiToken(db, expiring.token, "profile:read", new Date(now.getTime() + 2 * DAY)),
      ),
    ).toBe(401);
    expect(await revokeApiToken(db, live.user.id, live.id, now)).toBe(true);
    expect(await statusOf(authenticateApiToken(db, live.token, "profile:read", now))).toBe(401);
  });

  it("is refused with a 403 when it lacks the scope the call needs", async () => {
    const { user, token } = await tokenFor("ana@example.com");
    await db.update(apiTokens).set({ scopes: [] }).where(eq(apiTokens.userId, user.id));
    expect(await statusOf(authenticateApiToken(db, token, "profile:read", now))).toBe(403);
  });

  it("can be revoked only by its owner", async () => {
    const mine = await tokenFor("ana@example.com");
    const other = await createUser(db, "bia@example.com");
    expect(await revokeApiToken(db, other.id, mine.id, now)).toBe(false);
    expect(await listApiTokens(db, mine.user.id)).toHaveLength(1);
    expect(await revokeApiToken(db, mine.user.id, mine.id, now)).toBe(true);
    expect(await revokeApiToken(db, mine.user.id, mine.id, now)).toBe(false);
    expect(await listApiTokens(db, mine.user.id)).toEqual([]);
  });

  it("moves its last use at most once a minute", async () => {
    const { id, token } = await tokenFor("ana@example.com");
    const lastUse = async () =>
      (await db.select().from(apiTokens).where(eq(apiTokens.id, id)))[0]?.lastUsedAt;
    await authenticateApiToken(db, token, "profile:read", now);
    expect(await lastUse()).toEqual(now);
    await authenticateApiToken(db, token, "profile:read", new Date(now.getTime() + 30_000));
    expect(await lastUse()).toEqual(now);
    const later = new Date(now.getTime() + 90_000);
    await authenticateApiToken(db, token, "profile:read", later);
    expect(await lastUse()).toEqual(later);
  });

  it("is limited to ten in force per person", async () => {
    const user = await createUser(db, "ana@example.com");
    const make = () =>
      createApiToken(db, user.id, { name: "x", scopes: ["profile:read"], expiresAt: null });
    for (let n = 0; n < 10; n += 1) {
      await make();
    }
    expect(await statusOf(make())).toBe(409);
  });

  it("goes with the account", async () => {
    const { user } = await tokenFor("ana@example.com");
    const { users } = await import("@/lib/db/schema/users");
    await db.delete(users).where(eq(users.id, user.id));
    expect(await db.select().from(apiTokens)).toEqual([]);
  });
});
