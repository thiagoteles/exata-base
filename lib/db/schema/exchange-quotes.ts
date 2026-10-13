import { pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { calendarDate, createdAt, id, updatedAt } from "../columns";

export const exchangeQuoteStatus = pgEnum("exchange_quote_status", ["found", "none"]);

/*
 * What a source answered for a currency on a day. A published closing quote never changes, so a
 * row is written once and kept; a day the source had no closing for is kept as `none` once it is in
 * the past, so a weekend is not asked about twice. The rates are decimal text, never floats. No
 * person owns a row: a quote is the same for everyone.
 */
export const exchangeQuotes = pgTable(
  "exchange_quotes",
  {
    id: id(),
    source: text().notNull(),
    currency: text().notNull(),
    quoteDay: calendarDate().notNull(),
    status: exchangeQuoteStatus().notNull(),
    buyRate: text(),
    sellRate: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex().on(table.source, table.currency, table.quoteDay)],
);
