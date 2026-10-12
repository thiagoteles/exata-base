import { eq } from "drizzle-orm";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { exportAccount } from "@/lib/accounts/export";
import { referrals } from "@/lib/db/schema/referrals";
import { users } from "@/lib/db/schema/users";
import type { FileStorage } from "@/lib/ports/storage/types";
import { recordReferral, recordReferralForEmail, referralSummary } from "@/lib/referral/service";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const now = new Date();
const DAY = 86_400_000;

const noStorage: FileStorage = {
  put: () => Promise.resolve(),
  get: () => Promise.resolve(null),
  remove: () => Promise.resolve(),
  signedUrl: () => Promise.resolve(""),
};

async function codeOf(id: string) {
  return (await referralSummary(db, id)).code;
}

describe("a person's referral code", () => {
  it("is made by the database for every account, twelve letters and digits, each its own", async () => {
    const people = await Promise.all(
      ["a", "b", "c", "d", "e"].map((name) => createUser(db, `${name}@example.com`)),
    );
    const codes = await Promise.all(people.map((person) => codeOf(person.id)));
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[a-z0-9]{12}$/);
    }
  });

  it("cannot be changed into something that is not a code", async () => {
    const ana = await createUser(db, "ana@example.com");
    await expect(
      db.update(users).set({ referralCode: "NOT A CODE" }).where(eq(users.id, ana.id)),
    ).rejects.toThrow();
  });
});

describe("recording who invited whom", () => {
  it("counts a new arrival by someone else's code, and names the inviter as they were", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    expect(
      await recordReferral(db, { referredId: bia.id, rawCode: await codeOf(ana.id), now }),
    ).toBe("counts");
    const [row] = await db.select().from(referrals);
    expect(row).toMatchObject({
      referredId: bia.id,
      referrerId: ana.id,
      referrerEmail: "ana@example.com",
    });
    expect((await referralSummary(db, ana.id)).invited).toBe(1);
    expect((await referralSummary(db, bia.id)).invited).toBe(0);
  });

  it("accepts the code in any case and with spaces around it, since it came from a cookie", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    const raw = ` ${(await codeOf(ana.id)).toUpperCase()} `;
    expect(await recordReferral(db, { referredId: bia.id, rawCode: raw, now })).toBe("counts");
  });

  it("refuses a person's own code, a code nobody has, and text that is not a code", async () => {
    const ana = await createUser(db, "ana@example.com");
    const own = await codeOf(ana.id);
    expect(await recordReferral(db, { referredId: ana.id, rawCode: own, now })).toBe("own_code");
    expect(await recordReferral(db, { referredId: ana.id, rawCode: "000000000000", now })).toBe(
      "unknown_code",
    );
    for (const raw of ["", "x", "'; drop table users; --", undefined, null]) {
      expect(await recordReferral(db, { referredId: ana.id, rawCode: raw, now })).toBe("no_code");
    }
    expect(await db.select().from(referrals)).toEqual([]);
  });

  it("invites a person once: the second code and the same code again change nothing", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    const cris = await createUser(db, "cris@example.com");
    const first = await codeOf(ana.id);
    expect(await recordReferral(db, { referredId: cris.id, rawCode: first, now })).toBe("counts");
    expect(await recordReferral(db, { referredId: cris.id, rawCode: first, now })).toBe(
      "already_invited",
    );
    expect(
      await recordReferral(db, { referredId: cris.id, rawCode: await codeOf(bia.id), now }),
    ).toBe("already_invited");
    const rows = await db.select().from(referrals);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.referrerId).toBe(ana.id);
  });

  it("does not count an account that is not new, however it arrived", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    await db
      .update(users)
      .set({ createdAt: new Date(now.getTime() - 8 * DAY) })
      .where(eq(users.id, bia.id));
    expect(
      await recordReferral(db, { referredId: bia.id, rawCode: await codeOf(ana.id), now }),
    ).toBe("too_late");
    expect(await db.select().from(referrals)).toEqual([]);
  });

  it("finds the account by e-mail, whatever its case, for the sign-up form", async () => {
    const ana = await createUser(db, "ana@example.com");
    await createUser(db, "bia@example.com");
    expect(
      await recordReferralForEmail(db, {
        email: "Bia@Example.com",
        rawCode: await codeOf(ana.id),
        now,
      }),
    ).toBe("counts");
    expect(
      await recordReferralForEmail(db, {
        email: "nobody@example.com",
        rawCode: await codeOf(ana.id),
        now,
      }),
    ).toBe("no_code");
  });
});

describe("when an account is deleted", () => {
  it("keeps the row, and the inviter's e-mail, when the inviter goes", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    await recordReferral(db, { referredId: bia.id, rawCode: await codeOf(ana.id), now });
    await db.delete(users).where(eq(users.id, ana.id));
    const [row] = await db.select().from(referrals);
    expect(row).toMatchObject({
      referredId: bia.id,
      referrerId: null,
      referrerEmail: "ana@example.com",
    });
  });

  it("takes the row with it when the person who arrived goes", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    await recordReferral(db, { referredId: bia.id, rawCode: await codeOf(ana.id), now });
    await db.delete(users).where(eq(users.id, bia.id));
    expect(await db.select().from(referrals)).toEqual([]);
    expect((await referralSummary(db, ana.id)).invited).toBe(0);
  });

  it("does not hand the inviter's e-mail to the person they invited in the export", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    await recordReferral(db, { referredId: bia.id, rawCode: await codeOf(ana.id), now });
    const zip = unzipSync(await exportAccount(db, noStorage, bia.id, now));
    const text = new TextDecoder().decode(zip["data.json"]);
    expect(text).not.toContain("ana@example.com");
    expect(Object.keys(JSON.parse(text) as object)).not.toContain("referral");
  });
});
