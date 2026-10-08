import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";
import { z } from "@/lib/validation";

const session = vi.hoisted(() => ({ role: null as null | "member" | "staff" | "admin" }));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ "x-request-id": "req-1" })),
}));
vi.mock("@/lib/ports/auth", async () => {
  const { hasRole } = await import("@/lib/accounts/roles");
  return {
    requireRole: (minimum: "member" | "staff" | "admin") => {
      if (session.role === null) {
        return Promise.reject(new DomainError(401));
      }
      if (!hasRole(session.role, minimum)) {
        return Promise.reject(new DomainError(403));
      }
      return Promise.resolve({
        id: "u1",
        email: "a@b.c",
        name: "A",
        role: session.role,
        options: {},
      });
    },
  };
});

const { actionFor } = await import("./client");

const staffEcho = actionFor("staff")
  .inputSchema(z.object({ note: z.string().min(3) }))
  .action(({ ctx, parsedInput }) => Promise.resolve({ by: ctx.user.id, note: parsedInput.note }));
const failing = actionFor("member").action(() =>
  Promise.reject(new Error("database password leaked")),
);

beforeEach(() => {
  session.role = null;
});

describe("server actions", () => {
  it("refuse a visitor who is not signed in, in the domain error shape", async () => {
    expect((await staffEcho({ note: "oi!" }))?.serverError).toEqual({
      status: 401,
      key: "unauthorized",
      requestId: "req-1",
    });
  });

  it("refuse a role below the action's minimum, and accept one above it", async () => {
    session.role = "member";
    expect((await staffEcho({ note: "oi!" }))?.serverError).toMatchObject({
      status: 403,
      key: "forbidden",
    });
    session.role = "admin";
    expect((await staffEcho({ note: "oi!" }))?.data).toEqual({ by: "u1", note: "oi!" });
  });

  it("return field errors as catalog keys before running the action", async () => {
    session.role = "staff";
    const result = await staffEcho({ note: "x" });
    expect(result?.data).toBeUndefined();
    expect(JSON.parse(result?.validationErrors?.fieldErrors.note?.[0] ?? "{}")).toEqual({
      key: "tooShort",
      values: { minimum: 3 },
    });
  });

  it("never expose an unexpected error", async () => {
    session.role = "member";
    expect((await failing())?.serverError).toEqual({
      status: 500,
      key: "internal",
      requestId: "req-1",
    });
  });
});
