import { describe, expect, it } from "vitest";
import { exchangeQuotes } from "@/lib/db/schema/exchange-quotes";
import { closingQuote } from "@/lib/exchange-rate/service";
import type { ExchangeRateSource } from "@/lib/ports/exchange-rate/types";
import { testDatabase } from "./database";

const db = testDatabase();

/** A source that answers for the days it has and counts how often it was asked. */
function source(closings: Record<string, { buy: string; sell: string }>, fails = false) {
  const asked: { from: string; to: string }[] = [];
  const quoteSource: ExchangeRateSource = {
    name: "test",
    closings: (_currency, from, to) => {
      asked.push({ from, to });
      if (fails) {
        return Promise.reject(new Error("down"));
      }
      return Promise.resolve(
        Object.entries(closings)
          .filter(([day]) => day >= from && day <= to)
          .map(([day, rates]) => ({ day, ...rates })),
      );
    },
  };
  return { quoteSource, asked };
}

const FRIDAY = "2026-10-09";
const SATURDAY = "2026-10-10";
const MONDAY = "2026-10-12";
const published = { [FRIDAY]: { buy: "4.9886", sell: "4.9892" } };

describe("the closing quote for a day", () => {
  it("answers a published day with that day's closing and keeps it", async () => {
    const { quoteSource, asked } = source(published);
    const first = await closingQuote(db, {
      currency: "USD",
      day: FRIDAY,
      today: MONDAY,
      source: quoteSource,
    });
    expect(first).toEqual({
      status: "found",
      requestedDay: FRIDAY,
      quoteDay: FRIDAY,
      buy: "4.9886",
      sell: "4.9892",
    });
    expect(asked).toHaveLength(1);
    const again = await closingQuote(db, {
      currency: "USD",
      day: FRIDAY,
      today: MONDAY,
      source: quoteSource,
    });
    expect(again).toEqual(first);
    expect(asked).toHaveLength(1);
  });

  it("takes the latest earlier closing for a weekend and does not ask again about it", async () => {
    const { quoteSource, asked } = source(published);
    const result = await closingQuote(db, {
      currency: "USD",
      day: SATURDAY,
      today: MONDAY,
      source: quoteSource,
    });
    expect(result).toMatchObject({ status: "found", requestedDay: SATURDAY, quoteDay: FRIDAY });
    await closingQuote(db, { currency: "USD", day: SATURDAY, today: MONDAY, source: quoteSource });
    expect(asked).toHaveLength(1);
    const none = await db.select().from(exchangeQuotes);
    expect(none.find((row) => row.quoteDay === SATURDAY)?.status).toBe("none");
  });

  it("keeps a currency apart from another", async () => {
    const { quoteSource } = source(published);
    await closingQuote(db, { currency: "USD", day: FRIDAY, today: MONDAY, source: quoteSource });
    const other = source({ [FRIDAY]: { buy: "5.5", sell: "5.6" } });
    const eur = await closingQuote(db, {
      currency: "EUR",
      day: FRIDAY,
      today: MONDAY,
      source: other.quoteSource,
    });
    expect(eur).toMatchObject({ status: "found", buy: "5.5" });
  });

  it("does not remember today as having no closing, so the bulletin is found later", async () => {
    const early = source({});
    const before = await closingQuote(db, {
      currency: "USD",
      day: MONDAY,
      today: MONDAY,
      source: early.quoteSource,
    });
    expect(before).toEqual({ status: "no_quote" });
    const stored = await db.select().from(exchangeQuotes);
    expect(stored.find((row) => row.quoteDay === MONDAY)).toBeUndefined();
    const later = source({ [MONDAY]: { buy: "5", sell: "5.1" } });
    expect(
      await closingQuote(db, {
        currency: "USD",
        day: MONDAY,
        today: MONDAY,
        source: later.quoteSource,
      }),
    ).toMatchObject({ status: "found", quoteDay: MONDAY });
  });

  it("is unavailable when the source fails and the table does not know the days", async () => {
    const down = source({}, true);
    expect(
      await closingQuote(db, {
        currency: "USD",
        day: FRIDAY,
        today: MONDAY,
        source: down.quoteSource,
      }),
    ).toEqual({ status: "unavailable" });
  });

  it("still answers a day already kept when the source is down", async () => {
    const { quoteSource } = source(published);
    await closingQuote(db, { currency: "USD", day: FRIDAY, today: MONDAY, source: quoteSource });
    const down = source({}, true);
    expect(
      await closingQuote(db, {
        currency: "USD",
        day: FRIDAY,
        today: MONDAY,
        source: down.quoteSource,
      }),
    ).toMatchObject({ status: "found", quoteDay: FRIDAY });
  });

  it("says there is no quote when a range with no closing is known to be empty", async () => {
    const empty = source({});
    expect(
      await closingQuote(db, {
        currency: "USD",
        day: "2026-01-04",
        today: MONDAY,
        source: empty.quoteSource,
      }),
    ).toEqual({ status: "no_quote" });
  });
});
