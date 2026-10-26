import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { addTierStatements, checkPlanTiers } from "@/lib/db/plan-tiers";
import { plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import { testDatabase } from "./database";

const db = testDatabase();
// Tiers no other file adds: the files share one database, and an added value stays in the type.
const tierNames = ["free", "bronze", "silver"];

describe("the plan tiers the database holds", () => {
  it("accept the base's catalog on the base's migrations", async () => {
    await expect(checkPlanTiers(db)).resolves.toBeUndefined();
  });

  // Fails when a server starts on a type that lacks a sold tier, and the first plan written on it
  // breaks instead of the start.
  it("refuse a catalog the type lacks, and take it once the migration db:tiers writes has run", async () => {
    await expect(checkPlanTiers(db, tierNames)).rejects.toThrow(
      "plan tiers out of date: missing bronze, silver. Run pnpm db:tiers",
    );
    await db.execute(
      sql.raw(addTierStatements(["bronze", "silver"]).replaceAll("--> statement-breakpoint", "")),
    );
    await expect(checkPlanTiers(db, tierNames)).resolves.toBeUndefined();

    const [user] = await db.insert(users).values({ email: "ana@example.com" }).returning();
    if (user === undefined) {
      throw new Error("user was not created");
    }
    await db.execute(sql`update plans set tier = 'silver' where user_id = ${user.id}`);
    const [plan] = await db.select().from(plans).where(eq(plans.userId, user.id));
    expect(plan?.tier).toBe("silver");
  });

  // Fails when a tier leaves the catalog while plans are still on it, which would then resolve no
  // rights at all.
  it("refuse a catalog that dropped a tier a plan is still on", async () => {
    const [user] = await db.insert(users).values({ email: "bia@example.com" }).returning();
    if (user === undefined) {
      throw new Error("user was not created");
    }
    await db.update(plans).set({ tier: "paid" }).where(eq(plans.userId, user.id));
    await expect(checkPlanTiers(db, ["free", "bronze"])).rejects.toThrow(
      "plans are on tiers the catalog no longer has: paid",
    );
  });
});
