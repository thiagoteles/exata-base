/*
 * Which day's quote converts an amount, and which side of it. Accountants differ on both and no
 * source cites a rule, so a product keeps the policy per account and shows it with the quote. The
 * quote of a day is the closing one the central bank published, and a day with none (a weekend, a
 * holiday, or the hours before the bulletin) takes the latest earlier day that has one.
 */

import { addDays } from "./dates";

export type RateSide = "buy" | "sell";

/** The day the quote is wanted for. */
type RateReference = "issue_day" | "receipt_day" | "day_before_issue";

export type RatePolicy = { side: RateSide; reference: RateReference };

/** The default the product starts with: the sell quote of the day before the invoice was issued. */
export const defaultRatePolicy: RatePolicy = { side: "sell", reference: "day_before_issue" };

export type RateDays = { issue: string; receipt?: string | undefined };

/** The day to ask for under a policy, or null when the policy needs a receipt day that is not known. */
export function referenceDay(policy: RatePolicy, days: RateDays): string | null {
  switch (policy.reference) {
    case "issue_day":
      return days.issue;
    case "day_before_issue":
      return addDays(days.issue, -1);
    case "receipt_day":
      return days.receipt ?? null;
    default:
      return policy.reference satisfies never;
  }
}

export type ClosingRates = { buy: string; sell: string };

export function pickRate(rates: ClosingRates, side: RateSide): string {
  return side === "buy" ? rates.buy : rates.sell;
}
