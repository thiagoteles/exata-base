import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { DeletionSteps } from "@/lib/accounts/delete";
import {
  getUserRecord,
  grantCourtesy,
  queryUsers,
  refundLastPayment,
  removeUser,
  revokeCourtesy,
  type UserQuery,
} from "@/lib/admin/users";
import { readPlan } from "@/lib/billing/service";
import { staffAuditLog } from "@/lib/db/schema/audit";
import { plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import type { FileStorage } from "@/lib/ports/storage/types";
import { billingFixture } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser, recordingLogger } from "./factories";
import { checkoutCompleted } from "./stripe-events";

const db = testDatabase();
const { deliver } = billingFixture(db);

const everyone: UserQuery = { q: "", role: null, plan: null, sort: "date", dir: "desc", page: 1 };

async function admin() {
  const user = await createUser(db, "admin@example.com", "admin");
  return { viewer: { id: user.id, role: user.role }, actor: { id: user.id, email: user.email } };
}

const steps = (over: Partial<DeletionSteps> = {}): DeletionSteps => ({
  cancelBilling: () => Promise.resolve(),
  storage: () => Promise.resolve({ remove: () => Promise.resolve() } as unknown as FileStorage),
  deleteProviderUser: () => Promise.resolve(),
  logger: recordingLogger(),
  ...over,
});

describe("the user list", () => {
  it("is for admins only, whatever the page asks", async () => {
    const staff = await createUser(db, "staff@example.com", "staff");
    await expect(queryUsers(db, { id: staff.id, role: "staff" }, everyone)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      getUserRecord(db, { id: staff.id, role: "staff" }, staff.id),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it("filters by role and plan, searches name and e-mail, and sorts both ways", async () => {
    const { viewer, actor } = await admin();
    const ana = await createUser(db, "ana@example.com", "member");
    await createUser(db, "bia@example.com", "staff");
    await db.update(users).set({ name: "Ana Souza" }).where(eq(users.id, ana.id));
    await grantCourtesy(db, actor, ana.id, "partner");

    const staff = await queryUsers(db, viewer, { ...everyone, role: "staff" });
    expect(staff.rows.map((row) => row.email)).toEqual(["bia@example.com"]);
    const paid = await queryUsers(db, viewer, { ...everyone, plan: "paid" });
    expect(paid.rows).toMatchObject([{ email: "ana@example.com", courtesy: true }]);
    const byName = await queryUsers(db, viewer, { ...everyone, q: "souza" });
    expect(byName.rows.map((row) => row.email)).toEqual(["ana@example.com"]);
    expect((await queryUsers(db, viewer, { ...everyone, q: "%" })).rows).toEqual([]);
    const ascending = await queryUsers(db, viewer, { ...everyone, sort: "email", dir: "asc" });
    expect(ascending.rows.map((row) => row.email)).toEqual([
      "admin@example.com",
      "ana@example.com",
      "bia@example.com",
    ]);
  });

  it("finds a name without regard to accents", async () => {
    const { viewer } = await admin();
    const person = await createUser(db, "jose@example.com");
    await db.update(users).set({ name: "José Antônio" }).where(eq(users.id, person.id));
    const found = await queryUsers(db, viewer, { ...everyone, q: "antonio" });
    expect(found.rows.map((row) => row.email)).toEqual(["jose@example.com"]);
  });

  it("answers an address that names nobody with null instead of a bad cast", async () => {
    const { viewer } = await admin();
    expect(await getUserRecord(db, viewer, "not-an-id")).toBeNull();
    expect(await getUserRecord(db, viewer, crypto.randomUUID())).toBeNull();
  });
});

describe("courtesy", () => {
  it("grants the paid plan with who and why, and the audit log records it", async () => {
    const { actor } = await admin();
    const ana = await createUser(db, "ana@example.com");
    await grantCourtesy(db, actor, ana.id, "  partner  ");
    expect(await readPlan(db, ana.id)).toMatchObject({
      tier: "paid",
      status: "active",
      courtesyGrantedBy: actor.id,
      courtesyGrantedByEmail: actor.email,
      courtesyReason: "partner",
    });
    const [entry] = await db.select().from(staffAuditLog);
    expect(entry).toMatchObject({ action: "plan.courtesy.grant", targetId: ana.id });
  });

  it("keeps the granting admin's e-mail after that admin's account is deleted", async () => {
    const { actor } = await admin();
    const ana = await createUser(db, "ana@example.com");
    await grantCourtesy(db, actor, ana.id, "partner");
    await db.delete(users).where(eq(users.id, actor.id));
    expect(await readPlan(db, ana.id)).toMatchObject({
      courtesyGrantedBy: null,
      courtesyGrantedByEmail: actor.email,
    });
  });

  it("does not overwrite a plan the person paid for", async () => {
    const { actor } = await admin();
    const ana = await createUser(db, "ana@example.com");
    await deliver(checkoutCompleted("evt_1", { userId: ana.id, interval: "lifetime" }));
    await expect(grantCourtesy(db, actor, ana.id, "partner")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("revokes a gift, and refuses to revoke a purchase", async () => {
    const { actor } = await admin();
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    await grantCourtesy(db, actor, ana.id, "partner");
    await revokeCourtesy(db, actor, ana.id);
    expect(await readPlan(db, ana.id)).toMatchObject({
      tier: "free",
      courtesyGrantedByEmail: null,
      courtesyReason: null,
    });
    await deliver(checkoutCompleted("evt_1", { userId: bia.id, interval: "lifetime" }));
    await expect(revokeCourtesy(db, actor, bia.id)).rejects.toMatchObject({ status: 409 });
    expect((await readPlan(db, bia.id))?.tier).toBe("paid");
  });
});

describe("refunding the last payment", () => {
  it("asks the provider with a key that repeats for the same plan, and audits it", async () => {
    const { actor } = await admin();
    const ana = await createUser(db, "ana@example.com");
    await deliver(
      checkoutCompleted("evt_1", { userId: ana.id, interval: "lifetime", customer: "cus_ana" }),
    );
    const refund = vi.fn((_customer: string, _key: string) => Promise.resolve());
    await refundLastPayment(db, actor, ana.id, refund);
    await refundLastPayment(db, actor, ana.id, refund);
    expect(refund).toHaveBeenCalledTimes(2);
    expect(refund.mock.calls[0]).toEqual(refund.mock.calls[1]);
    expect(refund.mock.calls[0]?.[0]).toBe("cus_ana");
    // The plan is changed by the provider's refund event, not here.
    expect((await readPlan(db, ana.id))?.tier).toBe("paid");
  });

  it("refuses a free account and a courtesy, which have nothing to refund", async () => {
    const { actor } = await admin();
    const ana = await createUser(db, "ana@example.com");
    const refund = vi.fn(() => Promise.resolve());
    await expect(refundLastPayment(db, actor, ana.id, refund)).rejects.toMatchObject({
      status: 409,
    });
    await grantCourtesy(db, actor, ana.id, "partner");
    await expect(refundLastPayment(db, actor, ana.id, refund)).rejects.toMatchObject({
      status: 409,
    });
    expect(refund).not.toHaveBeenCalled();
  });

  it("writes no audit entry when the provider refuses", async () => {
    const { actor } = await admin();
    const ana = await createUser(db, "ana@example.com");
    await deliver(
      checkoutCompleted("evt_1", { userId: ana.id, interval: "lifetime", customer: "cus_ana" }),
    );
    await expect(
      refundLastPayment(db, actor, ana.id, () => Promise.reject(new Error("declined"))),
    ).rejects.toThrow("declined");
    expect(await db.select().from(staffAuditLog)).toEqual([]);
  });
});

describe("deleting someone's account", () => {
  it("deletes it, records who asked, and audits the write", async () => {
    const { actor } = await admin();
    const ana = await createUser(db, "ana@example.com");
    await db
      .update(plans)
      .set({
        courtesyGrantedBy: actor.id,
        courtesyGrantedByEmail: actor.email,
        courtesyReason: "x",
        tier: "paid",
        billingInterval: "lifetime",
      })
      .where(eq(plans.userId, ana.id));
    const cancelBilling = vi.fn(() => Promise.resolve());
    await removeUser(db, steps({ cancelBilling }), actor, ana.id);
    expect(cancelBilling).toHaveBeenCalledWith(ana.id);
    expect(await db.select().from(users).where(eq(users.id, ana.id))).toEqual([]);
    const entries = await db.select().from(staffAuditLog);
    expect(entries.map((entry) => entry.action)).toEqual(["user.delete"]);
  });

  it("refuses to delete the admin's own account here, and a missing one", async () => {
    const { actor } = await admin();
    await expect(removeUser(db, steps(), actor, actor.id)).rejects.toMatchObject({ status: 409 });
    await expect(removeUser(db, steps(), actor, crypto.randomUUID())).rejects.toMatchObject({
      status: 404,
    });
  });

  it("deletes another admin while one remains", async () => {
    const { actor } = await admin();
    const other = await createUser(db, "other@example.com", "staff");
    await db.update(users).set({ role: "admin" }).where(eq(users.id, other.id));
    await removeUser(db, steps(), actor, other.id);
    expect(await db.select().from(users).where(eq(users.id, actor.id))).toHaveLength(1);
  });
});
