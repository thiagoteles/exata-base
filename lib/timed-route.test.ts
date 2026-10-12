import { beforeEach, describe, expect, it, vi } from "vitest";

const logged = vi.hoisted(() => [] as unknown[]);
vi.mock("@/lib/ports/log", () => ({
  logger: { info: (_message: string, fields: unknown) => logged.push(fields) },
}));

const { timedRoute } = await import("./timed-route");

beforeEach(() => {
  logged.length = 0;
});

describe("timed routes", () => {
  it("log the route pattern, the method, the status and the duration", async () => {
    const handler = timedRoute("/storage/[...key]", (request: Request) =>
      Promise.resolve(new Response(request.method, { status: 404 })),
    );
    const response = await handler(new Request("http://app.test/storage/a/b", { method: "HEAD" }));
    expect(response.status).toBe(404);
    expect(logged).toEqual([
      { route: "/storage/[...key]", method: "HEAD", ms: expect.any(Number), status: 404 },
    ]);
  });

  it("log a handler that throws as 500 and let the error go on", async () => {
    const handler = timedRoute("/events", () => Promise.reject(new Error("boom")));
    await expect(handler()).rejects.toThrow("boom");
    expect(logged).toEqual([
      { route: "/events", method: "GET", ms: expect.any(Number), status: 500 },
    ]);
  });
});
