import { describe, expect, it } from "vitest";
import { contactMessages } from "@/lib/db/schema/contact";
import { isRecordId, visibleTo } from "./rules";

describe("who sees which record", () => {
  it("filters a person's own read by the owner column", () => {
    expect(visibleTo({ id: "u1", role: "member" }, "mine", contactMessages.userId)).toBeDefined();
  });

  it("lets the team read everyone's and refuses the whole list to anyone else", () => {
    expect(visibleTo({ id: "s1", role: "staff" }, "all", contactMessages.userId)).toBeUndefined();
    expect(visibleTo({ id: "a1", role: "admin" }, "all", contactMessages.userId)).toBeUndefined();
    expect(() => visibleTo({ id: "u1", role: "member" }, "all", contactMessages.userId)).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("tells a record id from any other address", () => {
    expect(isRecordId("0c6f5c1e-3f4a-4a56-9f0e-8a1d7e5b2c31")).toBe(true);
    expect(isRecordId("not-an-id")).toBe(false);
    expect(isRecordId("0c6f5c1e-3f4a-4a56-9f0e-8a1d7e5b2c31x")).toBe(false);
  });
});
