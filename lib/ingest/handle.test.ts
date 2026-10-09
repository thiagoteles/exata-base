import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/db/database";
import { DomainError } from "@/lib/errors";
import { z } from "@/lib/validation";
import { handleIngest, type IngestCall, type IngestDeps } from "./handle";
import { ingestSource } from "./source";

const secret = "s".repeat(32);
const now = new Date("2026-10-09T12:00:00Z");

const applied: unknown[] = [];
const sources = {
  echo: ingestSource(z.object({ n: z.int() }).strict(), ({ payload }) => {
    applied.push(payload);
    return Promise.resolve({ received: payload.n });
  }),
};

function setup(over: Partial<IngestDeps> = {}) {
  const limited: string[] = [];
  const read: string[] = [];
  const deps: IngestDeps = {
    db: {} as Database,
    sources,
    secrets: { echo: secret },
    now,
    enforceLimit: (name) => {
      limited.push(name);
      return Promise.resolve();
    },
    ...over,
  };
  const call = (changes: Partial<IngestCall> = {}) =>
    handleIngest(deps, {
      source: "echo",
      authorization: `Bearer ${secret}`,
      contentLength: null,
      readBody: () => {
        read.push("body");
        return Promise.resolve('{"n":3}');
      },
      ...changes,
    });
  return { call, limited, read };
}

const status = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 200;
  } catch (error) {
    return error instanceof DomainError ? error.status : 500;
  }
};

describe("ingest", () => {
  it("applies a valid payload from the source's own secret and returns the counts", async () => {
    applied.length = 0;
    const { call } = setup();
    expect(await call()).toEqual({ received: 3 });
    expect(applied).toEqual([{ n: 3 }]);
  });

  it("answers 401 alike for an unknown source, a source with no secret, a wrong secret and none", async () => {
    const { call, limited, read } = setup({ secrets: { echo: secret, other: "o".repeat(32) } });
    expect(await status(call({ source: "nope" }))).toBe(401);
    expect(await status(call({ source: "toString" }))).toBe(401);
    expect(await status(call({ source: "__proto__" }))).toBe(401);
    expect(await status(call({ authorization: "Bearer wrong" }))).toBe(401);
    expect(await status(call({ authorization: null }))).toBe(401);
    // A secret that belongs to another source does not open this one.
    expect(await status(call({ authorization: `Bearer ${"o".repeat(32)}` }))).toBe(401);
    const { call: noSecret } = setup({ secrets: {} });
    expect(await status(noSecret())).toBe(401);
    // Nothing was counted or read for a caller that never proved itself.
    expect(limited).toEqual([]);
    expect(read).toEqual([]);
  });

  it("counts the call against the source after the secret and before the body", async () => {
    const { call, limited, read } = setup({
      enforceLimit: () => Promise.reject(new DomainError(429)),
    });
    expect(await status(call())).toBe(429);
    expect(read).toEqual([]);
    expect(limited).toEqual([]);
    const ok = setup();
    await ok.call();
    expect(ok.limited).toEqual(["echo"]);
  });

  it("refuses a body that is declared or turns out too large, before parsing it", async () => {
    const big = setup();
    expect(await status(big.call({ contentLength: 2_000_000 }))).toBe(400);
    expect(big.read).toEqual([]);
    const sneaky = setup();
    expect(
      await status(sneaky.call({ readBody: () => Promise.resolve(" ".repeat(1_048_577)) })),
    ).toBe(400);
  });

  it("refuses text that is not JSON and JSON that does not fit the source's shape", async () => {
    const { call } = setup();
    for (const body of ["{not json", "[]", '{"n":"3"}', '{"n":3,"extra":1}', "null", ""]) {
      expect(await status(call({ readBody: () => Promise.resolve(body) }))).toBe(400);
    }
  });
});
