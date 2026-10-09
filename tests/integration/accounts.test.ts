import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { upsertClerkUser } from "@/lib/accounts/clerk-sync";
import { applyConfirmedEmail } from "@/lib/accounts/confirmation";
import { createInvite, findPendingInvite, revokeInvite } from "@/lib/accounts/invites";
import { changeRole } from "@/lib/accounts/role-change";
import { staffAuditLog } from "@/lib/db/schema/audit";
import { invites } from "@/lib/db/schema/invites";
import { users } from "@/lib/db/schema/users";
import { readPreferences, readStoredOptions, savePreference } from "@/lib/preferences/service";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const roleOf = async (id: string) =>
  (await db.select().from(users).where(eq(users.id, id)))[0]?.role;

describe("promotion on a confirmed e-mail", () => {
  it("makes an ADMIN_EMAILS address admin, and never demotes", async () => {
    const boss = await createUser(db, "boss@example.com");
    await applyConfirmedEmail(db, boss.id, ["boss@example.com"], new Date());
    expect(await roleOf(boss.id)).toBe("admin");

    const other = await createUser(db, "other@example.com", "staff");
    await applyConfirmedEmail(db, other.id, [], new Date());
    expect(await roleOf(other.id)).toBe("staff");
  });

  it("applies a pending invite once, and ignores an expired or revoked one", async () => {
    const admin = await createUser(db, "admin@example.com", "admin");
    const actor = { id: admin.id, email: admin.email };
    const past = new Date(Date.now() - 30 * 86_400_000);

    await createInvite(db, actor, { email: "Late@Example.com", role: "staff" }, past);
    const revoked = await createInvite(
      db,
      actor,
      { email: "gone@example.com", role: "staff" },
      new Date(),
    );
    await revokeInvite(db, actor, revoked.id, new Date());
    const valid = await createInvite(
      db,
      actor,
      { email: "new@example.com", role: "staff" },
      new Date(),
    );

    const late = await createUser(db, "late@example.com");
    const gone = await createUser(db, "gone@example.com");
    const fresh = await createUser(db, "new@example.com");
    for (const user of [late, gone, fresh]) {
      await applyConfirmedEmail(db, user.id, [], new Date());
    }

    expect([await roleOf(late.id), await roleOf(gone.id), await roleOf(fresh.id)]).toEqual([
      "member",
      "member",
      "staff",
    ]);
    expect(await findPendingInvite(db, valid.token, new Date())).toBeNull();
    const [accepted] = await db.select().from(invites).where(eq(invites.id, valid.id));
    expect(accepted?.acceptedAt).toBeInstanceOf(Date);
  });

  it("keeps only the hash of an invite token", async () => {
    const admin = await createUser(db, "admin@example.com", "admin");
    const { token } = await createInvite(
      db,
      { id: admin.id, email: admin.email },
      { email: "x@example.com", role: "member" },
      new Date(),
    );
    const stored = JSON.stringify(await db.select().from(invites));
    expect(stored).not.toContain(token);
    expect(await findPendingInvite(db, token, new Date())).toEqual({
      email: "x@example.com",
      role: "member",
    });
  });
});

describe("Clerk sync", () => {
  const profile = { clerkId: "user_1", email: "Ana@Example.com", name: "Ana", image: null };

  it("creates the row once, however many times it runs, and promotes on creation", async () => {
    const first = await upsertClerkUser(db, profile, ["ana@example.com"], new Date());
    const second = await upsertClerkUser(
      db,
      { ...profile, name: "Ana Maria" },
      ["ana@example.com"],
      new Date(),
    );
    expect(first.created).toBe(true);
    expect(second).toEqual({ id: first.id, created: false });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: "ana@example.com",
      name: "Ana Maria",
      role: "admin",
      emailVerified: true,
    });
  });

  it("links an existing row with the same e-mail instead of duplicating it", async () => {
    const seeded = await createUser(db, "ana@example.com", "admin");
    expect(await upsertClerkUser(db, profile, [], new Date())).toEqual({
      id: seeded.id,
      created: false,
    });
    expect((await db.select().from(users))[0]?.clerkId).toBe("user_1");
  });
});

describe("changing a role", () => {
  it("is recorded in the staff audit log", async () => {
    const admin = await createUser(db, "admin@example.com", "admin");
    const member = await createUser(db, "m@example.com");
    await changeRole(db, { id: admin.id, email: admin.email }, member.id, "staff");
    expect(await roleOf(member.id)).toBe("staff");
    const [entry] = await db.select().from(staffAuditLog);
    expect(entry).toMatchObject({
      action: "user.role.change",
      targetId: member.id,
      details: { from: "member", to: "staff" },
    });
  });

  it("refuses to demote the last admin", async () => {
    const admin = await createUser(db, "admin@example.com", "admin");
    const actor = { id: admin.id, email: admin.email };
    await expect(changeRole(db, actor, admin.id, "member")).rejects.toMatchObject({ status: 409 });

    const second = await createUser(db, "second@example.com", "admin");
    await changeRole(db, actor, second.id, "member");
    expect(await roleOf(second.id)).toBe("member");
  });
});

describe("preferences in the options column", () => {
  it("saves one preference without touching the others, and the last value wins", async () => {
    const user = await createUser(db, "ana@example.com");
    await db
      .update(users)
      .set({ options: { locale: "pt-BR", somethingElse: 1 } })
      .where(eq(users.id, user.id));

    expect(await savePreference(db, user.id, "theme", "dark")).toBe("dark");
    expect(await readStoredOptions(db, user.id)).toEqual({
      locale: "pt-BR",
      somethingElse: 1,
      theme: "dark",
    });

    await savePreference(db, user.id, "theme", "light");
    expect((await readStoredOptions(db, user.id))["theme"]).toBe("light");
    await savePreference(db, user.id, "theme", "system");
    expect((await readPreferences(db, user.id)).theme).toBe("system");
  });

  it("refuses a value the registry does not allow, and stores nothing", async () => {
    const user = await createUser(db, "ana@example.com");
    for (const value of ["sepia", 3, null, undefined, { theme: "dark" }]) {
      await expect(savePreference(db, user.id, "theme", value)).rejects.toMatchObject({
        status: 400,
      });
    }
    expect(await readStoredOptions(db, user.id)).toEqual({});
  });

  it("reads every preference as a valid value: the saved one, or the fallback when it is missing or stale", async () => {
    const user = await createUser(db, "ana@example.com");
    expect(await readPreferences(db, user.id)).toEqual({ theme: "system", locale: "pt-BR" });
    await db
      .update(users)
      .set({ options: { theme: "sepia", locale: "xx-XX", removedOption: true } })
      .where(eq(users.id, user.id));
    expect(await readPreferences(db, user.id)).toEqual({ theme: "system", locale: "pt-BR" });
    await savePreference(db, user.id, "theme", "dark");
    expect(await readPreferences(db, user.id)).toEqual({ theme: "dark", locale: "pt-BR" });
  });

  it("changes only the person it is asked to change", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    await savePreference(db, ana.id, "theme", "dark");
    expect(await readStoredOptions(db, bia.id)).toEqual({});
  });

  it("keeps a value that looks like SQL as a value", async () => {
    const user = await createUser(db, "ana@example.com");
    await expect(
      savePreference(db, user.id, "theme", "dark'); drop table users; --"),
    ).rejects.toMatchObject({ status: 400 });
    expect(await db.select().from(users)).toHaveLength(1);
  });
});
