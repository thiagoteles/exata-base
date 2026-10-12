/*
 * Which calendar day an instant falls on depends on where the person is: 02:30 UTC on the 1st is
 * still the 31st in São Paulo. Rules that count days (a streak, "today", a reminder at nine in the
 * morning) take the person's time zone beside the instant, so two people in different zones each
 * get their own day.
 */

const formats = new Map<string, Intl.DateTimeFormat>();

function formatFor(timeZone: string): Intl.DateTimeFormat {
  const known = formats.get(timeZone);
  if (known !== undefined) {
    return known;
  }
  // The "en-CA" locale writes year-month-day, which is the order of an ISO date.
  const created = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  formats.set(timeZone, created);
  return created;
}

/** The calendar date, `YYYY-MM-DD`, an instant falls on in a time zone. A zone that does not exist throws. */
export function dateInZone(instant: Date, timeZone: string): string {
  return formatFor(timeZone).format(instant);
}

/** Whether a name is a time zone this runtime knows, such as `America/Sao_Paulo` or `UTC`. */
export function isTimeZone(value: string): boolean {
  try {
    formatFor(value);
    return true;
  } catch {
    return false;
  }
}
