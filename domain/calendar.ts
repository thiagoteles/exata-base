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

const clocks = new Map<string, Intl.DateTimeFormat>();

/** How far the zone's wall clock is ahead of UTC at an instant, in milliseconds. */
function offsetAt(instant: number, timeZone: string): number {
  let clock = clocks.get(timeZone);
  if (clock === undefined) {
    clock = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    clocks.set(timeZone, clock);
  }
  const part = Object.fromEntries(
    clock.formatToParts(new Date(instant)).map(({ type, value }) => [type, Number(value)]),
  ) as Partial<Record<Intl.DateTimeFormatPartTypes, number>>;
  const wall = Date.UTC(
    part.year ?? 0,
    (part.month ?? 1) - 1,
    part.day ?? 1,
    part.hour ?? 0,
    part.minute ?? 0,
    part.second ?? 0,
  );
  return wall - Math.floor(instant / 1000) * 1000;
}

/**
 * The first instant of a calendar date in a time zone: its midnight, or the moment the day starts
 * when the clock jumps over midnight for summer time.
 */
export function startOfDayIn(date: string, timeZone: string): Date {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const wall = Date.UTC(year, month - 1, day);
  const first = wall - offsetAt(wall, timeZone);
  const second = wall - offsetAt(first, timeZone);
  // Around a change of offset one of the two guesses lands on the day before; the earliest that is
  // on the date is where it starts.
  const onDate = [first, second].filter(
    (instant) => dateInZone(new Date(instant), timeZone) === date,
  );
  return new Date(Math.min(...(onDate.length > 0 ? onDate : [first])));
}
