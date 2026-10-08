import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { migrateDatabase } from "@/lib/db/migrate";
import { staffAuditLog } from "@/lib/db/schema/audit";
import { accounts, sessions } from "@/lib/db/schema/auth";
import { plans } from "@/lib/db/schema/billing";
import { contactMessages } from "@/lib/db/schema/contact";
import { files } from "@/lib/db/schema/files";
import { invites } from "@/lib/db/schema/invites";
import { users } from "@/lib/db/schema/users";
import { SEED_ADMIN_EMAIL, seedDatabase } from "@/lib/db/seed";
import { testDatabase } from "./database";

const db = testDatabase();

async function createUser(email: string, role: "member" | "staff" | "admin" = "member") {
  const [user] = await db.insert(users).values({ email, role }).returning();
  if (user === undefined) {
    throw new Error("user was not created");
  }
  return user;
}

const inOneDay = () => new Date(Date.now() + 86_400_000);

describe("database", () => {
  it("applies migrations again without changing anything", async () => {
    await expect(migrateDatabase(db)).resolves.toBeUndefined();
  });

  it("starts every new account on the free plan", async () => {
    const user = await createUser("ana@example.com");
    const [plan] = await db.select().from(plans).where(eq(plans.userId, user.id));
    expect(plan).toMatchObject({ tier: "free", status: "active", billingInterval: null });
  });

  it("refuses an e-mail that is not lowercase", async () => {
    await expect(createUser("Ana@Example.com")).rejects.toThrow();
  });

  it("refuses a free plan with a billing interval", async () => {
    const user = await createUser("ana@example.com");
    await expect(
      db.update(plans).set({ billingInterval: "monthly" }).where(eq(plans.userId, user.id)),
    ).rejects.toThrow();
  });

  it("seeds one admin, however many times it runs", async () => {
    await seedDatabase(db);
    await db.update(users).set({ role: "member" }).where(eq(users.email, SEED_ADMIN_EMAIL));
    await seedDatabase(db);
    const admins = await db.select().from(users).where(eq(users.email, SEED_ADMIN_EMAIL));
    expect(admins).toHaveLength(1);
    expect(admins[0]).toMatchObject({ role: "admin", emailVerified: true });
  });
});

describe("deleting an account", () => {
  it("deletes what the person owns and keeps what they authored, with their e-mail", async () => {
    const admin = await createUser("admin@example.com", "admin");
    const member = await createUser("bia@example.com");

    await db.insert(sessions).values({ userId: admin.id, token: "t1", expiresAt: inOneDay() });
    await db
      .insert(accounts)
      .values({ userId: admin.id, accountId: "a1", providerId: "credential" });
    await db.insert(files).values({
      ownerId: admin.id,
      name: "a.pdf",
      contentType: "application/pdf",
      sizeBytes: 1,
      storageKey: "k1",
    });
    await db.insert(contactMessages).values([
      { userId: admin.id, name: "Admin", email: admin.email, subject: "general", body: "oi" },
      {
        userId: member.id,
        name: "Bia",
        email: member.email,
        subject: "support",
        body: "ajuda",
        status: "answered",
        answeredAt: new Date(),
        answeredBy: admin.id,
        answeredByEmail: admin.email,
      },
    ]);
    await db.insert(invites).values({
      email: "novo@example.com",
      role: "staff",
      tokenHash: "h1",
      expiresAt: inOneDay(),
      invitedBy: admin.id,
      invitedByEmail: admin.email,
    });
    await db
      .update(plans)
      .set({
        tier: "paid",
        courtesyGrantedBy: admin.id,
        courtesyGrantedByEmail: admin.email,
        courtesyReason: "parceria",
      })
      .where(eq(plans.userId, member.id));
    await db.insert(staffAuditLog).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "plan.courtesy.grant",
      targetTable: "plans",
      targetId: member.id,
    });

    await db.delete(users).where(eq(users.id, admin.id));

    expect(await db.select().from(sessions)).toHaveLength(0);
    expect(await db.select().from(accounts)).toHaveLength(0);
    expect(await db.select().from(files)).toHaveLength(0);
    expect(await db.select().from(plans).where(eq(plans.userId, admin.id))).toHaveLength(0);

    const messages = await db.select().from(contactMessages);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      userId: member.id,
      answeredBy: null,
      answeredByEmail: admin.email,
    });

    const [invite] = await db.select().from(invites);
    expect(invite).toMatchObject({ invitedBy: null, invitedByEmail: admin.email });

    const [plan] = await db.select().from(plans).where(eq(plans.userId, member.id));
    expect(plan).toMatchObject({
      tier: "paid",
      courtesyGrantedBy: null,
      courtesyGrantedByEmail: admin.email,
    });

    const [entry] = await db.select().from(staffAuditLog);
    expect(entry).toMatchObject({ actorId: null, actorEmail: admin.email });
  });
});
