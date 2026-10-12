/*
 * How often a scheduled operation runs. The host calls one address per cadence on its own cron,
 * and each call runs the operations that declared that cadence. A new product that needs a
 * different rhythm adds it here, with a line in the host's cron and in the absence alarms.
 */

export const cadences = ["daily", "hourly", "every-5-min"] as const;
export type Cadence = (typeof cadences)[number];

export function isCadence(value: string): value is Cadence {
  return (cadences as readonly string[]).includes(value);
}
