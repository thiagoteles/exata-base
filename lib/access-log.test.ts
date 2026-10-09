import { describe, expect, it } from "vitest";
import { accessRecord } from "./access-log";

const now = new Date("2026-06-01T15:00:00Z");

describe("access record", () => {
  it("keeps the trusted address, the source port, the time with zone, and no query", () => {
    const headers = new Headers({
      "x-forwarded-for": "6.6.6.6, 203.0.113.9",
      "x-forwarded-client-port": "51234",
    });
    expect(accessRecord({ headers, method: "GET", path: "/conta" }, "traefik", now)).toEqual({
      logName: "access",
      address: "203.0.113.9",
      port: "51234",
      at: "2026-06-01T15:00:00.000Z",
      method: "GET",
      path: "/conta",
    });
  });

  it("reads Cloudflare's headers behind Cloudflare, and says when the port is unknown", () => {
    const headers = new Headers({ "cf-connecting-ip": "198.51.100.4" });
    expect(accessRecord({ headers, method: "POST", path: "/" }, "cloudflare", now)).toMatchObject({
      address: "198.51.100.4",
      port: null,
    });
  });
});
