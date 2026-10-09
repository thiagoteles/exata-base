import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const logged = vi.hoisted(() => ({ errors: [] as unknown[][] }));
const counted = vi.hoisted(() => ({ subjects: [] as string[], allowed: true }));

vi.mock("@/lib/ports/log", () => ({
  logger: {
    error: (...args: unknown[]) => {
      logged.errors.push(args);
    },
    info: () => undefined,
  },
}));

vi.mock("@/lib/db/client", () => ({ db: {} }));
vi.mock("@/lib/rate-limit/service", () => ({
  consume: (_db: unknown, _rule: unknown, subject: string) => {
    counted.subjects.push(subject);
    return Promise.resolve({ allowed: counted.allowed, remaining: 0, retryAfterSeconds: 60 });
  },
}));

const { POST } = await import("./route");

const send = (body: string, headers: Record<string, string> = {}) =>
  POST(
    new NextRequest("http://localhost/api/client-errors", {
      method: "POST",
      body,
      headers: { "user-agent": "test", "x-forwarded-for": "9.9.9.9", ...headers },
    }),
  );

const valid = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ source: "page", message: "boom", path: "/account", ...over });

beforeEach(() => {
  logged.errors.length = 0;
  counted.subjects.length = 0;
  counted.allowed = true;
});

describe("the browser error route", () => {
  it("logs a valid report as an error and answers with no body", async () => {
    const response = await send(valid({ message: "first" }));
    expect(response.status).toBe(204);
    expect(logged.errors).toHaveLength(1);
    expect(logged.errors[0]?.[0]).toBe("browser error");
  });

  it("writes the same error from the same browser once, and a different one separately", async () => {
    await send(valid({ message: "repeated" }));
    await send(valid({ message: "repeated" }));
    await send(valid({ message: "other" }));
    expect(logged.errors).toHaveLength(2);
  });

  it("counts the address the proxy appended, not the one the caller forged", async () => {
    await send(valid({ message: "forged" }), { "x-forwarded-for": "6.6.6.6, 9.9.9.9" });
    expect(counted.subjects).toEqual(["address:9.9.9.9"]);
  });

  it("answers 429 without logging once an address is over the limit", async () => {
    counted.allowed = false;
    expect((await send(valid({ message: "loop" }))).status).toBe(429);
    expect(logged.errors).toHaveLength(0);
  });

  it("refuses a body over 8 KB, bad JSON and the wrong shape without logging", async () => {
    expect((await send(valid({ stack: "x".repeat(9000) }))).status).toBe(413);
    expect((await send("{not json")).status).toBe(400);
    expect((await send(valid({ extra: true }))).status).toBe(400);
    expect(logged.errors).toHaveLength(0);
  });
});
