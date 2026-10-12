import { describe, expect, it } from "vitest";
import { niceTicks } from "./scale";

describe("nice ticks", () => {
  it("steps by 1, 2 or 5 times a power of ten and covers the largest value", () => {
    expect(niceTicks(9)).toEqual([0, 5, 10]);
    expect(niceTicks(37)).toEqual([0, 10, 20, 30, 40]);
    expect(niceTicks(2990)).toEqual([0, 1000, 2000, 3000]);
    expect(niceTicks(0.7)).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
  });

  it("steps a count by whole numbers", () => {
    expect(niceTicks(2, { integer: true })).toEqual([0, 1, 2]);
    expect(niceTicks(3, { integer: true })).toEqual([0, 1, 2, 3]);
    expect(niceTicks(2)).toEqual([0, 0.5, 1, 1.5, 2]);
  });

  it("gives an empty series an axis from 0 to 1", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
