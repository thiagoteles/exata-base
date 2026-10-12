import { describe, expect, it } from "vitest";
import { DomainError, errorBody } from "./errors";

describe("domain errors", () => {
  it("keep their status and key, with the request id", () => {
    expect(errorBody(new DomainError(404), "req-1")).toEqual({
      error: { status: 404, key: "notFound", requestId: "req-1" },
    });
    expect(errorBody(new DomainError(409, "conflict"), "req-2").error.status).toBe(409);
  });

  it("never expose an unexpected error", () => {
    expect(errorBody(new Error("database password leaked"), "req-3")).toEqual({
      error: { status: 500, key: "internal", requestId: "req-3" },
    });
  });
});
