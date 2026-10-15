/*
 * Which day's quote converts an amount, and which side of it. Accountants differ on both and no
 * source cites a rule, so a product keeps the policy per account and shows it with the quote. The
 * quote of a day is the closing one the central bank published, and a day with none (a weekend, a
 * holiday, or the hours before the bulletin) takes the latest earlier day that has one.
 */

import { addDays } from "./dates";

const rateSides = ["buy", "sell"] as const;
export type RateSide = (typeof rateSides)[number];

/** What an issuer chooses: one side of the quote, or no conversion of its own (only rates typed by hand). */
export const rateChoices = [...rateSides, "none"] as const;
export type RateChoice = (typeof rateChoices)[number];

/** The day the quote is wanted for. */
export const rateReferences = [
  "issue_day",
  "receipt_day",
  "day_before_issue",
  "nfse_day",
  "day_before_nfse",
] as const;
export type RateReference = (typeof rateReferences)[number];

export type RatePolicy = { side: RateSide; reference: RateReference };

/** The default the product starts with: the sell quote of the day before the invoice was issued. */
export const defaultRatePolicy: RatePolicy = { side: "sell", reference: "day_before_issue" };

export type RateDays = {
  issue: string;
  receipt?: string | undefined;
  /** The day the fiscal note was issued, once the accountant gave it. */
  nfse?: string | undefined;
};

/** The day to ask for under a policy, or null when it needs a receipt or note day that is not known. */
export function referenceDay(policy: RatePolicy, days: RateDays): string | null {
  switch (policy.reference) {
    case "issue_day":
      return days.issue;
    case "day_before_issue":
      return addDays(days.issue, -1);
    case "receipt_day":
      return days.receipt ?? null;
    case "nfse_day":
      return days.nfse ?? null;
    case "day_before_nfse":
      return days.nfse === undefined ? null : addDays(days.nfse, -1);
    default:
      return policy.reference satisfies never;
  }
}

export type ClosingRates = { buy: string; sell: string };

export function pickRate(rates: ClosingRates, side: RateSide): string {
  return side === "buy" ? rates.buy : rates.sell;
}
