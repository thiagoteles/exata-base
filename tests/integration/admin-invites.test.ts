import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createInvite } from "@/lib/accounts/invites";
import { queryAudit } from "@/lib/admin/audit";
import { inviteByEmail, inviteStatus, queryInvites } from "@/lib/admin/invites";
import { staffAuditLog } from "@/lib/db/schema/audit";
import { invites } from "@/lib/db/schema/invites";
import { users } from "@/lib/db/schema/users";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const now = new Date("2026-03-15T12:00:00Z");
const DAY = 86_400_000;

async function admin() {
  const user = await createUser(db, "admin@example.com", "admin");
  return { viewer: { id: user.id, role: user.role }, actor: { id: user.id, email: user.email } };
}

/** One invite in each situation, relative to `now`. */
async function seed(actor: { id: string; email: string }) {
  const make = async (email: string) => {
    const created = await createInvite(db, actor, { email, role: "staff" }, now);
    return created.id;
  };
  const pending = await make("pending@example.com");
  const accepted = await make("accepted@example.com");
  const revoked = await make("revoked@example.com");
  const expired = await make("expired@example.com");
  await db.update(invites).set({ acceptedAt: now }).where(eq(invites.id, accepted));
  await db.update(invites).set({ revokedAt: now }).where(eq(invites.id, revoked));
  await db
    .update(invites)
    .set({ expiresAt: new Date(now.getTime() - DAY) })
    .where(eq(invites.id, expired));
  return { pending, accepted, revoked, expired };
}

describe("the invite list", () => {
  it("shows each invite in its own situation, and the clock never overrides accepted or revoked", async () => {
    const { viewer, actor } = await admin();
    const ids = await seed(actor);
    // Age every invite past its expiry: accepted and revoked still read as what they are.
    await db.update(invites).set({ expiresAt: new Date(now.getTime() - DAY) });
    const { rows } = await queryInvites(db, viewer, { q: "", status: null, page: 1 }, now);
    const byId = Object.fromEntries(rows.map((row) => [row.id, row.status]));
    expect(byId).toEqual({
      [ids.pending]: "expired",
      [ids.accepted]: "accepted",
      [ids.revoked]: "revoked",
      [ids.expired]: "expired",
    });
  });

  it("filters by situation and searches the address", async () => {
    const { viewer, actor } = await admin();
    const ids = await seed(actor);
    const only = async (status: "pending" | "accepted" | "expired" | "revoked") =>
      (await queryInvites(db, viewer, { q: "", status, page: 1 }, now)).rows.map((row) => row.id);
    expect(await only("pending")).toEqual([ids.pending]);
    expect(await only("accepted")).toEqual([ids.accepted]);
    expect(await only("revoked")).toEqual([ids.revoked]);
    expect(await only("expired")).toEqual([ids.expired]);
    const found = await queryInvites(db, viewer, { q: "revoked@", status: null, page: 1 }, now);
    expect(found.rows.map((row) => row.id)).toEqual([ids.revoked]);
  });

  it("is for admins only", async () => {
    const staff = await createUser(db, "staff@example.com", "staff");
    await expect(
      queryInvites(db, { id: staff.id, role: "staff" }, { q: "", status: null, page: 1 }, now),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("derives the situation the same way in code", () => {
    const base = { acceptedAt: null, revokedAt: null, expiresAt: new Date(now.getTime() + DAY) };
    expect(inviteStatus(base, now)).toBe("pending");
    expect(inviteStatus({ ...base, expiresAt: now }, now)).toBe("expired");
  });
});

describe("inviting an address", () => {
  it("stores the invite, hands the token to the sender and audits it", async () => {
    const { actor } = await admin();
    const send = vi.fn(() => Promise.resolve(true));
    await inviteByEmail(db, actor, { email: "New@Example.com", role: "staff" }, send);
    expect(send).toHaveBeenCalledOnce();
    const [stored] = await db.select().from(invites);
    expect(stored).toMatchObject({ email: "new@example.com", role: "staff", revokedAt: null });
    expect((await db.select().from(staffAuditLog)).map((entry) => entry.action)).toEqual([
      "invite.create",
    ]);
  });

  it("withdraws the invite when the e-mail was not sent, so the list shows nothing nobody got", async () => {
    const { actor } = await admin();
    await expect(
      inviteByEmail(db, actor, { email: "new@example.com", role: "staff" }, () =>
        Promise.resolve(false),
      ),
    ).rejects.toMatchObject({ status: 409, key: "emailNotSent" });
    const [stored] = await db.select().from(invites);
    expect(stored?.revokedAt).not.toBeNull();
  });

  it("refuses an address that already has an account", async () => {
    const { actor } = await admin();
    await createUser(db, "ana@example.com");
    const send = vi.fn(() => Promise.resolve(true));
    await expect(
      inviteByEmail(db, actor, { email: "ANA@example.com", role: "staff" }, send),
    ).rejects.toMatchObject({ status: 409, key: "emailTaken" });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("the audit list", () => {
  it("shows the newest first, filters by author and by day, and pages", async () => {
    const { viewer, actor } = await admin();
    const other = await createUser(db, "other@example.com", "staff");
    await db.insert(staffAuditLog).values([
      {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "a",
        targetTable: "t",
        createdAt: new Date("2026-03-01T15:00:00Z"),
      },
      {
        actorId: other.id,
        actorEmail: other.email,
        action: "b",
        targetTable: "t",
        createdAt: new Date("2026-03-02T15:00:00Z"),
      },
      // 02:30 UTC on the 4th is still the 3rd in São Paulo.
      {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "c",
        targetTable: "t",
        createdAt: new Date("2026-03-04T02:30:00Z"),
      },
    ]);
    const all = await queryAudit(db, viewer, { actor: "", from: null, to: null, page: 1 });
    expect(all.rows.map((row) => row.action)).toEqual(["c", "b", "a"]);

    const byAuthor = await queryAudit(db, viewer, {
      actor: "other@",
      from: null,
      to: null,
      page: 1,
    });
    expect(byAuthor.rows.map((row) => row.action)).toEqual(["b"]);

    const day = await queryAudit(db, viewer, {
      actor: "",
      from: "2026-03-03",
      to: "2026-03-03",
      page: 1,
    });
    expect(day.rows.map((row) => row.action)).toEqual(["c"]);
    const range = await queryAudit(db, viewer, {
      actor: "",
      from: "2026-03-02",
      to: "2026-03-03",
      page: 1,
    });
    expect(range.rows.map((row) => row.action)).toEqual(["c", "b"]);
  });

  it("keeps an entry readable after its author's account is gone", async () => {
    const { viewer } = await admin();
    const gone = await createUser(db, "gone@example.com", "staff");
    await db
      .insert(staffAuditLog)
      .values({ actorId: gone.id, actorEmail: gone.email, action: "x", targetTable: "t" });
    await db.delete(users).where(eq(users.id, gone.id));
    const { rows } = await queryAudit(db, viewer, {
      actor: "gone@",
      from: null,
      to: null,
      page: 1,
    });
    expect(rows).toMatchObject([{ actorId: null, actorEmail: "gone@example.com" }]);
  });

  it("is for admins only", async () => {
    const staff = await createUser(db, "staff@example.com", "staff");
    await expect(
      queryAudit(db, { id: staff.id, role: "staff" }, { actor: "", from: null, to: null, page: 1 }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
