import { describe, expect, it } from "vitest";
import { umamiSink } from "./adapters/umami";

type Sent = { url: string; init: RequestInit };

function recording(status: number, body = '{"sessionId":"s"}') {
  const sent: Sent[] = [];
  const fetch = ((url: URL, init: RequestInit) => {
    sent.push({ url: url.toString(), init });
    return Promise.resolve(new Response(body, { status }));
  }) as unknown as typeof globalThis.fetch;
  return { sent, fetch };
}

const base = {
  origin: "https://umami.example.com",
  websiteId: "4f0c2a8e-0000-4000-8000-000000000000",
  appUrl: "https://app.example.com/",
};

describe("Umami sink", () => {
  it("posts the event under the product's host, with the account's internal id", async () => {
    const { sent, fetch } = recording(200);
    const failures: string[] = [];
    const sink = umamiSink({ ...base, fetch, onFailure: (reason) => failures.push(reason) });
    await sink({
      name: "payment_confirmed",
      accountId: "acc_1",
      data: { method: "card", cents: 4900, revenue: 49, currency: "BRL" },
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe("https://umami.example.com/api/send");
    expect(JSON.parse(String(sent[0]?.init.body))).toEqual({
      type: "event",
      payload: {
        website: base.websiteId,
        hostname: "app.example.com",
        url: "/",
        name: "payment_confirmed",
        data: { method: "card", cents: 4900, revenue: 49, currency: "BRL" },
        id: "acc_1",
      },
    });
    // Empty on purpose: Umami drops "node" and any server name as a robot.
    expect(new Headers(sent[0]?.init.headers).get("user-agent")).toBe("");
    expect(failures).toEqual([]);
  });

  it("reports an event Umami discarded as a robot, though it answered 200", async () => {
    const failures: string[] = [];
    const sink = umamiSink({
      ...base,
      fetch: recording(200, '{"beep":"boop"}').fetch,
      onFailure: (reason) => failures.push(reason),
    });
    await sink({ name: "signup_completed", accountId: "a", data: {} });
    expect(failures).toEqual(["Umami discarded the event as a robot"]);
  });

  it("reports a refusal or an outage instead of throwing", async () => {
    const failures: string[] = [];
    const refused = umamiSink({
      ...base,
      fetch: recording(400).fetch,
      onFailure: (reason) => failures.push(reason),
    });
    const offline = umamiSink({
      ...base,
      fetch: (() => Promise.reject(new Error("offline"))) as typeof globalThis.fetch,
      onFailure: (reason) => failures.push(reason),
    });
    await expect(refused({ name: "signup_completed", accountId: "a", data: {} })).resolves.toBe(
      undefined,
    );
    await expect(offline({ name: "signup_completed", accountId: "a", data: {} })).resolves.toBe(
      undefined,
    );
    expect(failures).toEqual(["Umami answered 400", "offline"]);
  });
});
