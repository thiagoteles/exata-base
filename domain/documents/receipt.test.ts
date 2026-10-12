import { describe, expect, it } from "vitest";
import { receiptNumber } from "./receipt";

describe("the number of a receipt", () => {
  it("is the start of the payment id, short enough to read aloud", () => {
    expect(receiptNumber("0c6f5c1e-3f4a-4a56-9f0e-8a1d7e5b2c31")).toBe("R-0C6F5C1E");
  });
});
