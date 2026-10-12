import { getTableConfig, pgTable } from "drizzle-orm/pg-core";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { IsoDate } from "@/lib/date";
import { calendarDate } from "./columns";

describe("a calendar date column", () => {
  const table = pgTable("sample", { due: calendarDate() });

  it("is a Postgres date, with no time zone", () => {
    expect(getTableConfig(table).columns[0]?.getSQLType()).toBe("date");
  });

  it("is read back as a calendar date, so formatting it needs no cast", () => {
    expectTypeOf<typeof table.$inferSelect.due>().toEqualTypeOf<IsoDate | null>();
  });
});
