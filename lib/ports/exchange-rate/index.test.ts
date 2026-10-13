import { describe, expect, it } from "vitest";
import { fetchClosings } from ".";
import type { ExchangeRateSource } from "./types";

const answering = (quotes: { day: string; buy: string; sell: string }[]): ExchangeRateSource => ({
  name: "test",
  closings: () => Promise.resolve(quotes),
});

describe("the exchange-rate port", () => {
  it("passes the source's answer through, including an empty one", async () => {
    const quotes = [{ day: "2026-10-09", buy: "4.9886", sell: "4.9892" }];
    expect(await fetchClosings("USD", "2026-10-05", "2026-10-09", answering(quotes))).toEqual({
      status: "ok",
      quotes,
    });
    expect(await fetchClosings("USD", "2026-10-10", "2026-10-11", answering([]))).toEqual({
      status: "ok",
      quotes: [],
    });
  });

  it("reports a source that fails as unavailable, which is an answer", async () => {
    const failing: ExchangeRateSource = {
      name: "test",
      closings: () => Promise.reject(new Error("down")),
    };
    expect(await fetchClosings("USD", "2026-10-05", "2026-10-09", failing)).toEqual({
      status: "unavailable",
    });
  });
});
