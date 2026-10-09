/*
 * Whether a scheduled job is healthy, from its last run alone. The window is the same one the
 * absence alarm uses, so the panel and the alarm never disagree about a job being late.
 */

export type JobRun = { ranAt: Date; failed: number };

/** `late` wins over `failing`: a job that stopped running is the louder problem. */
export type JobState = "ok" | "failing" | "late" | "never";

const windowFormat = /^(\d+)s$/;

/** A window as Google Cloud writes it, in seconds ("88200s"), in milliseconds. */
export function windowMs(window: string): number {
  const match = windowFormat.exec(window);
  if (match?.[1] === undefined) {
    throw new Error(`A job window is a number of seconds, like "88200s": ${window}`);
  }
  return Number(match[1]) * 1000;
}

export function jobState(run: JobRun | null, window: number, now: Date): JobState {
  if (run === null) {
    return "never";
  }
  if (now.getTime() - run.ranAt.getTime() > window) {
    return "late";
  }
  return run.failed > 0 ? "failing" : "ok";
}
