import { and, eq, inArray } from "drizzle-orm";
import { daysUpTo } from "@/domain/exchange/dates";
import type { IsoDate } from "@/lib/date";
import type { Executor } from "@/lib/db/database";
import { exchangeQuotes } from "@/lib/db/schema/exchange-quotes";
import { fetchClosings } from "@/lib/ports/exchange-rate";
import type { ClosingQuote, ExchangeRateSource } from "@/lib/ports/exchange-rate/types";

/*
 * The closing quote for a day, kept once it is known. The latest closing on or before the day
 * counts, and the days asked about are the day and the nine before it, which spans a weekend and a
 * long holiday. Quotes are read from the table first and the source is asked only for what the
 * table does not know, in one request for the whole range.
 */

const LOOKBACK_DAYS = 10;
const SOURCE_NAME = "ptax";

export type ResolvedQuote =
  | { status: "found"; requestedDay: string; quoteDay: string; buy: string; sell: string }
  | { status: "no_quote" }
  | { status: "unavailable" };

type Known = { found: true; buy: string; sell: string } | { found: false };
type KnownDays = Map<string, Known>;

async function knownQuotes(
  executor: Executor,
  currency: string,
  window: readonly string[],
): Promise<KnownDays> {
  const rows = await executor
    .select()
    .from(exchangeQuotes)
    .where(
      and(
        eq(exchangeQuotes.source, SOURCE_NAME),
        eq(exchangeQuotes.currency, currency),
        inArray(exchangeQuotes.quoteDay, window as IsoDate[]),
      ),
    );
  const known: KnownDays = new Map();
  for (const row of rows) {
    const usable = row.status === "found" && row.buyRate !== null && row.sellRate !== null;
    known.set(
      row.quoteDay,
      usable && row.buyRate !== null && row.sellRate !== null
        ? { found: true, buy: row.buyRate, sell: row.sellRate }
        : { found: false },
    );
  }
  return known;
}

/**
 * What the source's answer adds to what is known: a closing for each published day, and a `none`
 * for each day that has passed without one, which never gets one (a weekend, a holiday). Today and
 * later are left unknown, because the bulletin may not be out yet.
 */
function learn(
  known: KnownDays,
  window: readonly string[],
  asked: { currency: string; today: string; published: readonly ClosingQuote[] },
): (typeof exchangeQuotes.$inferInsert)[] {
  const { currency, today, published } = asked;
  const byDay = new Map(published.map((quote) => [quote.day, quote]));
  const rows: (typeof exchangeQuotes.$inferInsert)[] = [];
  for (const candidate of window.filter((day) => !known.has(day))) {
    const quote = byDay.get(candidate);
    if (quote !== undefined) {
      known.set(candidate, { found: true, buy: quote.buy, sell: quote.sell });
      rows.push({
        source: SOURCE_NAME,
        currency,
        quoteDay: candidate as IsoDate,
        status: "found",
        buyRate: quote.buy,
        sellRate: quote.sell,
      });
    } else if (candidate < today) {
      known.set(candidate, { found: false });
      rows.push({
        source: SOURCE_NAME,
        currency,
        quoteDay: candidate as IsoDate,
        status: "none",
      });
    }
  }
  return rows;
}

/** The newest known closing in the window; unavailable when the source failed on a day it might hold. */
function answer(
  window: readonly string[],
  known: KnownDays,
  day: string,
  sourceFailed: boolean,
): ResolvedQuote {
  for (const candidate of window) {
    const entry = known.get(candidate);
    if (entry?.found === true) {
      return {
        status: "found",
        requestedDay: day,
        quoteDay: candidate,
        buy: entry.buy,
        sell: entry.sell,
      };
    }
    if (entry === undefined && sourceFailed) {
      return { status: "unavailable" };
    }
  }
  return { status: "no_quote" };
}

export async function closingQuote(
  executor: Executor,
  input: {
    currency: string;
    day: string;
    /** The person's today. A day before it has its bulletin or never will; today may not yet. */
    today: string;
    source?: ExchangeRateSource;
  },
): Promise<ResolvedQuote> {
  const { currency, day, today } = input;
  const window = daysUpTo(day, LOOKBACK_DAYS);
  const known = await knownQuotes(executor, currency, window);
  if (window.every((candidate) => known.has(candidate))) {
    return answer(window, known, day, false);
  }
  const oldest = window.at(-1) ?? day;
  const fetched = await fetchClosings(currency, oldest, day, input.source);
  if (fetched.status === "unavailable") {
    return answer(window, known, day, true);
  }
  const rows = learn(known, window, { currency, today, published: fetched.quotes });
  if (rows.length > 0) {
    await executor.insert(exchangeQuotes).values(rows).onConflictDoNothing();
  }
  return answer(window, known, day, false);
}
