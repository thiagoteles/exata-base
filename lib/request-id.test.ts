import { describe, expect, it } from "vitest";
import { REQUEST_ID_HEADER, requestIdFrom } from "./request-id";

const uuid = /^[0-9a-f-]{36}$/;

describe("request id", () => {
  it("keeps an id that came from upstream", () => {
    expect(requestIdFrom(new Headers({ [REQUEST_ID_HEADER]: "abc-12345" }))).toBe("abc-12345");
  });

  it("replaces anything that could be injected into a log line", () => {
    const id = requestIdFrom(new Headers({ [REQUEST_ID_HEADER]: "x level=error severity=ERROR" }));
    expect(id).toMatch(uuid);
  });
});
