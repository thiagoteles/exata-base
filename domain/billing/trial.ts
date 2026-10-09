/*
 * Where a trial stands, from its end, its length and the clock the caller hands in. A trial that
 * runs to the end of its last day still has that day, so the days left round up: ten minutes to go
 * is one day left, not none.
 */

const DAY_MS = 86_400_000;

export type TrialStanding = {
  state: "running" | "last-day" | "ended";
  daysLeft: number;
  /** Whole days used, never more than the length: for a bar that fills as the trial goes. */
  daysUsed: number;
  totalDays: number;
};

function stateFor(daysLeft: number): TrialStanding["state"] {
  if (daysLeft === 0) {
    return "ended";
  }
  return daysLeft === 1 ? "last-day" : "running";
}

export function trialStanding(input: {
  endsAt: Date;
  totalDays: number;
  now: Date;
}): TrialStanding {
  const { endsAt, totalDays, now } = input;
  const remaining = endsAt.getTime() - now.getTime();
  const daysLeft = remaining <= 0 ? 0 : Math.min(Math.ceil(remaining / DAY_MS), totalDays);
  return { state: stateFor(daysLeft), daysLeft, daysUsed: totalDays - daysLeft, totalDays };
}
