import { describe, expect, it } from "vitest";
import { readValidationMessage, validationMessage, z } from "./validation";

function firstMessage(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) {
    throw new Error("expected a validation failure");
  }
  return readValidationMessage(result.error.issues[0]?.message ?? "");
}

describe("validation messages are catalog keys", () => {
  it("names a missing field as required", () => {
    expect(firstMessage(z.object({ name: z.string() }), {})).toEqual({
      key: "required",
      values: {},
    });
  });

  it("carries the ICU values the message needs", () => {
    expect(firstMessage(z.string().min(3), "ab")).toEqual({
      key: "tooShort",
      values: { minimum: 3 },
    });
    expect(firstMessage(z.array(z.string()).max(1), ["a", "b"])).toEqual({
      key: "tooMany",
      values: { maximum: 1 },
    });
  });

  it("recognizes format and option errors", () => {
    expect(firstMessage(z.email(), "nope").key).toBe("invalidEmail");
    expect(firstMessage(z.enum(["a", "b"]), "c").key).toBe("invalidOption");
  });

  it("keeps the key a custom refinement chose", () => {
    const schema = z.string().refine(() => false, { message: validationMessage("invalidDate") });
    expect(firstMessage(schema, "x").key).toBe("invalidDate");
  });

  it("falls back to invalid for text it did not produce", () => {
    expect(readValidationMessage("free text")).toEqual({ key: "invalid", values: {} });
    expect(readValidationMessage(JSON.stringify({ key: "notAKey" }))).toEqual({
      key: "invalid",
      values: {},
    });
  });
});
