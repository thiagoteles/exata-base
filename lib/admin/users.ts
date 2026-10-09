import { and, asc, count, desc, eq, or } from "drizzle-orm";
import type { Actor } from "@/lib/accounts/actor";
import { recordStaffWrite } from "@/lib/accounts/audit";
import { type DeletionSteps, deleteAccount } from "@/lib/accounts/delete";
import type { Role } from "@/lib/accounts/roles";
import { freePlan, isCourtesy, type Plan } from "@/lib/billing/service";
import type { Database } from "@/lib/db/database";
import { plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import { contains } from "@/lib/db/search";
import { DomainError } from "@/lib/errors";
import { type PageWindow, pageWindow } from "@/lib/list-params";
import { type AdminViewer, assertAdmin, uuidShape } from "./guard";

/* The user list and record of the admin area, and the three writes that are not a role change. */

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  tier: Plan["tier"];
  courtesy: boolean;
};

export type UserQuery = {
  q: string;
  role: Role | null;
  plan: Plan["tier"] | null;
  sort: "date" | "name" | "email" | "role";
  dir: "asc" | "desc";
  page: number;
};

const sortColumns = {
  date: users.createdAt,
  name: users.name,
  email: users.email,
  role: users.role,
} as const;

const columns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
  tier: plans.tier,
  courtesyEmail: plans.courtesyGrantedByEmail,
};

const toRow = ({
  courtesyEmail,
  ...row
}: Omit<UserRow, "courtesy"> & { courtesyEmail: string | null }): UserRow => ({
  ...row,
  courtesy: courtesyEmail !== null,
});

export async function queryUsers(
  db: Database,
  viewer: AdminViewer,
  { q, role, plan, sort, dir, page }: UserQuery,
): Promise<{ rows: UserRow[]; window: PageWindow }> {
  assertAdmin(viewer);
  const term = q.trim();
  const where = and(
    role === null ? undefined : eq(users.role, role),
    plan === null ? undefined : eq(plans.tier, plan),
    term === "" ? undefined : or(contains(users.name, term), contains(users.email, term)),
  );
  const [{ total = 0 } = {}] = await db
    .select({ total: count() })
    .from(users)
    .innerJoin(plans, eq(plans.userId, users.id))
    .where(where);
  const window = pageWindow(page, total);
  const order = dir === "asc" ? asc(sortColumns[sort]) : desc(sortColumns[sort]);
  const rows = await db
    .select(columns)
    .from(users)
    .innerJoin(plans, eq(plans.userId, users.id))
    .where(where)
    .orderBy(order, desc(users.id))
    .limit(window.to === 0 ? 1 : window.to - window.from + 1)
    .offset(window.offset);
  return { rows: window.total === 0 ? [] : rows.map(toRow), window };
}

export type UserRecord = { user: typeof users.$inferSelect; plan: Plan };

/** One user with their plan, or null when the address names nobody. */
export async function getUserRecord(
  db: Database,
  viewer: AdminViewer,
  id: string,
): Promise<UserRecord | null> {
  assertAdmin(viewer);
  if (!uuidShape.test(id)) {
    return null;
  }
  const [row] = await db
    .select({ user: users, plan: plans })
    .from(users)
    .innerJoin(plans, eq(plans.userId, users.id))
    .where(eq(users.id, id));
  return row ?? null;
}

async function lockPlan(tx: Parameters<Parameters<Database["transaction"]>[0]>[0], userId: string) {
  const [plan] = await tx.select().from(plans).where(eq(plans.userId, userId)).for("update");
  if (plan === undefined) {
    throw new DomainError(404);
  }
  return plan;
}

/** Gives the paid plan without a charge. A plan that was bought is never overwritten by a gift. */
export async function grantCourtesy(
  db: Database,
  actor: Actor,
  userId: string,
  reason: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const plan = await lockPlan(tx, userId);
    if (plan.tier === "paid") {
      throw new DomainError(409, "alreadyPaid");
    }
    await tx
      .update(plans)
      .set({
        tier: "paid",
        status: "active",
        billingInterval: "lifetime",
        cancelAtPeriodEnd: false,
        courtesyGrantedBy: actor.id,
        courtesyGrantedByEmail: actor.email,
        courtesyReason: reason.trim(),
      })
      .where(eq(plans.userId, userId));
    await recordStaffWrite(tx, actor, {
      action: "plan.courtesy.grant",
      targetTable: "plans",
      targetId: userId,
      details: { reason: reason.trim() },
    });
  });
}

/** Takes a gift back. Only a courtesy can be revoked here; a purchase is refunded instead. */
export async function revokeCourtesy(db: Database, actor: Actor, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const plan = await lockPlan(tx, userId);
    if (plan.tier !== "paid" || !isCourtesy(plan)) {
      throw new DomainError(409);
    }
    await tx
      .update(plans)
      .set({
        ...freePlan,
        courtesyGrantedBy: null,
        courtesyGrantedByEmail: null,
        courtesyReason: null,
      })
      .where(eq(plans.userId, userId));
    await recordStaffWrite(tx, actor, {
      action: "plan.courtesy.revoke",
      targetTable: "plans",
      targetId: userId,
    });
  });
}

/**
 * Asks the provider to refund the last payment. The plan does not change here: the provider's
 * refund event does that, so a refund made in its own dashboard has the same effect. The key makes
 * a double click one refund.
 */
export async function refundLastPayment(
  db: Database,
  actor: Actor,
  userId: string,
  refund: (customerId: string, idempotencyKey: string) => Promise<void>,
): Promise<void> {
  const [plan] = await db.select().from(plans).where(eq(plans.userId, userId));
  if (plan === undefined) {
    throw new DomainError(404);
  }
  if (plan.tier !== "paid" || isCourtesy(plan)) {
    throw new DomainError(409, "nothingToRefund");
  }
  if (plan.providerCustomerId === null) {
    throw new DomainError(409, "noBillingAccount");
  }
  await refund(plan.providerCustomerId, `refund-${userId}-${plan.updatedAt.toISOString()}`);
  await recordStaffWrite(db, actor, {
    action: "plan.refund",
    targetTable: "plans",
    targetId: userId,
  });
}

/** Deletes someone's account for them. The trail keeps who asked; the audit log keeps that it happened. */
export async function removeUser(
  db: Database,
  steps: DeletionSteps,
  actor: Actor,
  userId: string,
): Promise<void> {
  if (userId === actor.id) {
    // An admin leaves through their own account page, which says what will be lost.
    throw new DomainError(409);
  }
  const done = await deleteAccount(db, steps, {
    userId,
    requestedBy: "admin",
    requestedByEmail: actor.email,
  });
  if (!done) {
    throw new DomainError(404);
  }
  await recordStaffWrite(db, actor, {
    action: "user.delete",
    targetTable: "users",
    targetId: userId,
  });
}
