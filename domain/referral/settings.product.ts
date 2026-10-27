/*
 * How the product's invitations behave, set by the product, which owns this file. `cookieDays` is how
 * long a visitor who arrived by a link is remembered before signing up; `windowDays` is how soon
 * after their account was made a sign-in still counts as brought by the link. `sources` are the
 * places a link may say it was shared from (`?via=<source>`), recorded with the invitation; a value
 * not listed is dropped. Each is lowercase letters, digits and hyphens.
 */
export const referralSettings = {
  cookieDays: 30,
  windowDays: 7,
  sources: [] as readonly string[],
};
