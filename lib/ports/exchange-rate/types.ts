/*
 * A closing quote: the reais one unit of a currency was worth on a day, on the buy and the sell
 * side, as the central bank published it. The numbers are decimal text, never floats.
 */
export type ClosingQuote = { day: string; buy: string; sell: string };

/**
 * A source of closing quotes. It answers for a range of days with the days that have a quote, and
 * throws when it cannot answer, so the port can say so. An empty list is an answer: the range has no
 * published closing (a weekend, a holiday, or the hours before the bulletin).
 */
export type ExchangeRateSource = {
  name: string;
  closings: (
    currency: string,
    from: string,
    to: string,
    signal: AbortSignal,
  ) => Promise<readonly ClosingQuote[]>;
};

export type ClosingsResult =
  | { status: "ok"; quotes: readonly ClosingQuote[] }
  | { status: "unavailable" };
