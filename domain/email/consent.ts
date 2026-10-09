/*
 * Who may be e-mailed what. Every message declares one category. What a person needs to run their
 * account (the confirmation link, a receipt, a reply to their own message) is always sent.
 * Reminders go out unless the person turned them off, and need an account to be about. News is
 * the only kind that needs a yes: nobody gets it by being signed up.
 */

export const emailCategories = ["transactional", "reminder", "news"] as const;
export type EmailCategory = (typeof emailCategories)[number];

export type EmailPreferences = { reminders: boolean; news: boolean };

export const defaultEmailPreferences: EmailPreferences = { reminders: true, news: false };

/** `preferences` is null when the address belongs to no account, which only transactional mail reaches. */
export function mayEmail(category: EmailCategory, preferences: EmailPreferences | null): boolean {
  switch (category) {
    case "transactional":
      return true;
    case "reminder":
      return preferences?.reminders === true;
    case "news":
      return preferences?.news === true;
    default:
      return category satisfies never;
  }
}
