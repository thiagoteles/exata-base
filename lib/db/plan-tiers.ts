import { sql } from "drizzle-orm";
import { tierNames } from "@/domain/billing/entitlements";
import type { Database } from "./database";
import { BASE_TIERS } from "./schema/billing";

/*
 * The tiers the database type holds. The base's migrations create it with its own two; the tiers a
 * product adds reach it through the product's migrations, which `pnpm db:tiers` writes. The type may
 * keep a value the catalog no longer has (Postgres removes none without rebuilding the type), as long
 * as no plan is on it.
 */

const ADD_VALUE = /ALTER TYPE "public"\."plan_tier" ADD VALUE IF NOT EXISTS '([^']+)'/g;

/** The statement that adds each tier to the type, one per tier, as a migration holds them. */
export const addTierStatements = (tiers: readonly string[]): string =>
  tiers
    .map((tier) => `ALTER TYPE "public"."plan_tier" ADD VALUE IF NOT EXISTS '${tier}';`)
    .join("\n--> statement-breakpoint\n");

/** The tiers the type holds once every migration has run, read from their text. */
export function tiersInMigrations(migrations: readonly string[]): Set<string> {
  const found = new Set<string>(BASE_TIERS);
  for (const text of migrations) {
    for (const match of text.matchAll(ADD_VALUE)) {
      found.add(match[1] as string);
    }
  }
  return found;
}

/**
 * Refuses to start on a database that cannot hold the catalog: a tier the type lacks fails the
 * first plan written on it, and a plan on a tier the catalog dropped has no rights to resolve.
 */
export async function checkPlanTiers(
  db: Database,
  tiers: readonly string[] = tierNames,
): Promise<void> {
  const typed = await db.execute<{ tier: string }>(
    sql`select unnest(enum_range(null::plan_tier))::text as tier`,
  );
  const held = new Set(typed.map((row) => row.tier));
  const missing = tiers.filter((tier) => !held.has(tier));
  if (missing.length > 0) {
    throw new Error(`plan tiers out of date: missing ${missing.join(", ")}. Run pnpm db:tiers`);
  }
  const used = await db.execute<{ tier: string }>(
    sql`select distinct tier::text as tier from plans`,
  );
  const dropped = used.map((row) => row.tier).filter((tier) => !tiers.includes(tier));
  if (dropped.length > 0) {
    throw new Error(
      `plans are on tiers the catalog no longer has: ${dropped.join(", ")}. ` +
        "Move them to another tier in a migration written by hand",
    );
  }
}
