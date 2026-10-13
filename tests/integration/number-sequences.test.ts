import { describe, expect, it } from "vitest";
import { nextNumber } from "@/lib/sequences/service";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();

describe("a numbered series", () => {
  it("starts at one and goes up by one", async () => {
    const ana = await createUser(db, "ana@example.com");
    expect(await nextNumber(db, ana.id, "INV")).toBe(1);
    expect(await nextNumber(db, ana.id, "INV")).toBe(2);
    expect(await nextNumber(db, ana.id, "INV")).toBe(3);
  });

  it("keeps each series and each person apart", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    expect(await nextNumber(db, ana.id, "INV")).toBe(1);
    expect(await nextNumber(db, ana.id, "NF")).toBe(1);
    expect(await nextNumber(db, bia.id, "INV")).toBe(1);
    expect(await nextNumber(db, ana.id, "INV")).toBe(2);
  });

  it("hands out distinct numbers with no gap to callers that arrive together", async () => {
    const ana = await createUser(db, "ana@example.com");
    const taken = await Promise.all(
      Array.from({ length: 25 }, () => db.transaction((tx) => nextNumber(tx, ana.id, "INV"))),
    );
    expect([...taken].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it("gives a number back when the transaction that took it is rolled back", async () => {
    const ana = await createUser(db, "ana@example.com");
    expect(await nextNumber(db, ana.id, "INV")).toBe(1);
    await expect(
      db.transaction(async (tx) => {
        expect(await nextNumber(tx, ana.id, "INV")).toBe(2);
        throw new Error("issuing failed");
      }),
    ).rejects.toThrow("issuing failed");
    expect(await nextNumber(db, ana.id, "INV")).toBe(2);
  });

  it("refuses a series that is not capital letters, digits and hyphens", async () => {
    const ana = await createUser(db, "ana@example.com");
    await expect(nextNumber(db, ana.id, "inv")).rejects.toThrow(RangeError);
  });
});
