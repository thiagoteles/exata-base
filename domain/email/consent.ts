/*
 * Who may be e-mailed what. Every message declares one category. What a person needs to run their
 * account (the confirmation link, a receipt, a reply to their own message) is always sent.
 * Reminders go out unless the person turned them off, and need an account to be about. News is
 * the only kind that needs a yes: nobody gets it by being signed up. Billing is what one person
 * sends another about money owed, such as a payment reminder to a client: it reaches an address
 * with no account, carries a link that stops it, and is never sent to an address that used the link.
 */

export const emailCategories = ["transactional", "reminder", "news", "billing"] as const;
export type EmailCategory = (typeof emailCategories)[number];

export type EmailPreferences = { reminders: boolean; news: boolean };

export const defaultEmailPreferences: EmailPreferences = { reminders: true, news: false };

/**
 * `preferences` is null when the address belongs to no account, which only transactional and billing
 * mail reach. `suppressed` is true when the address asked to stop billing mail; it matters to nothing else.
 */
export function mayEmail(
  category: EmailCategory,
  preferences: EmailPreferences | null,
  suppressed = false,
): boolean {
  switch (category) {
    case "transactional":
      return true;
    case "reminder":
      return preferences?.reminders === true;
    case "news":
      return preferences?.news === true;
    case "billing":
      return !suppressed;
    default:
      return category satisfies never;
  }
}
