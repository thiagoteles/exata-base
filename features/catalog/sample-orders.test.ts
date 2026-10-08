import { describe, expect, it } from "vitest";
import { queryOrders, sampleOrders } from "./sample-orders";

const base = { q: "", status: null, sort: "", dir: "asc", page: 1 } as const;

describe("sample orders", () => {
  it("pages the whole list", () => {
    const first = queryOrders(base);
    expect(first.rows).toHaveLength(20);
    expect(first.window).toMatchObject({ pages: 3, from: 1, to: 20, total: sampleOrders.length });
    expect(queryOrders({ ...base, page: 3 }).rows).toHaveLength(7);
  });

  it("searches ignoring accents and case, and combines with a status filter", () => {
    const found = queryOrders({ ...base, q: "FABIO" });
    expect(found.rows.length).toBeGreaterThan(0);
    expect(found.rows.every((order) => order.customer === "Fábio Dias")).toBe(true);
    const paid = queryOrders({ ...base, q: "fabio", status: "paid" });
    expect(paid.rows.every((order) => order.status === "paid")).toBe(true);
  });

  it("sorts both ways", () => {
    const ascending = queryOrders({ ...base, sort: "amount" }).rows.map((order) => order.amount);
    const descending = queryOrders({ ...base, sort: "amount", dir: "desc" }).rows.map(
      (order) => order.amount,
    );
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    expect(descending).toEqual([...descending].sort((a, b) => b - a));
  });

  it("returns an empty page with a valid window when nothing matches", () => {
    expect(queryOrders({ ...base, q: "zzz" })).toMatchObject({
      rows: [],
      window: { total: 0, from: 0, to: 0 },
    });
  });
});
