import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, inject, it } from "vitest";
import { createDatabase } from "@/lib/db/database";
import type { QueryTiming } from "@/lib/db/query-timing";
import { users } from "@/lib/db/schema/users";
import { testDatabase } from "./database";

// The shared database empties the tables; this second one, on the same Postgres, is timed.
testDatabase();
const timings: QueryTiming[] = [];
const db = createDatabase(inject("databaseUrl"), { onQuery: (timing) => timings.push(timing) });

afterAll(async () => {
  await db.$client.end();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("query timing", () => {
  it("times a plain query and still returns its rows", async () => {
    timings.length = 0;
    const rows = await db.execute<{ answer: number }>(sql`select ${41}::int + 1 as answer`);
    await settle();
    expect(rows[0]?.answer).toBe(42);
    expect(timings).toHaveLength(1);
    expect(timings[0]?.name).toBe("select");
    expect(timings[0]?.text).not.toContain("41");
    expect(timings[0]?.ms).toBeGreaterThanOrEqual(0);
  });

  it("times the queries inside a transaction and a savepoint, and keeps them atomic", async () => {
    timings.length = 0;
    await db.transaction(async (tx) => {
      await tx.insert(users).values({ email: "ana@example.com", name: "Ana" });
      await tx
        .transaction(async (inner) => {
          await inner
            .update(users)
            .set({ name: "Ana Maria" })
            .where(eq(users.email, "ana@example.com"));
          throw new Error("undo the inner change");
        })
        .catch(() => undefined);
    });
    await settle();
    const [row] = await db.select().from(users);
    expect(row?.name).toBe("Ana");
    expect(timings.map((timing) => timing.name)).toEqual(
      expect.arrayContaining(["insert users", "update users"]),
    );
  });

  it("reports a failing query too, and lets the error reach the caller", async () => {
    timings.length = 0;
    await expect(db.execute(sql`select * from missing_table`)).rejects.toThrow();
    await settle();
    expect(timings.map((timing) => timing.name)).toEqual(["select missing_table"]);
  });
});
