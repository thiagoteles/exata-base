import { describe, expect, it } from "vitest";
import { cadences, isCadence } from "./cadence";

describe("cadences", () => {
  it("knows its own names and nothing else", () => {
    for (const cadence of cadences) {
      expect(isCadence(cadence)).toBe(true);
    }
    for (const other of ["", "weekly", "Daily", "every-5-minutes", "__proto__", "toString"]) {
      expect(isCadence(other)).toBe(false);
    }
  });
});
