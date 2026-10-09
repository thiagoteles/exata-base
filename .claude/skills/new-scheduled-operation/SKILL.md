---
name: new-scheduled-operation
description: Add something that must happen on a schedule, such as a cleanup, a reminder, a sync or a report. Use instead of a new route, queue, worker or cron.
---

# New scheduled operation

The reference is `lib/scheduled/purge-invites.ts`. Scheduling is HTTP called from outside: the host
(Coolify) has one scheduled task per cadence, each posting to its address with `CRON_SECRET`
(`/events/daily`, `/events/hourly`, `/events/every-5-min`; `/events` is the same as `daily`). A call
runs every operation in `lib/scheduled/registry.ts` that declared that cadence. A new job is a new
entry there, never a new route, a queue, a worker or a cron inside the container.

1. **Write the operation** as a `ScheduledOperation`: a `name`, a `cadence` (from
   `domain/operations/cadence.ts`) and `run({ db, now })` that returns plain counts
   (`{ removed: 3 }`). Use `now` from the context, never `new Date()`, so a test can pick the moment.
   Pick the slowest cadence that is still right: a reminder for tomorrow does not need `every-5-min`.
2. **Make it idempotent.** Running the cadence twice in a row must change nothing the second time.
   Write the condition so that what was done no longer matches (delete what is old, mark what was
   sent), not a counter that increments.
3. **Keep one failure from costing the rest.** The runner already catches, logs (`scheduled
   operation started`, `finished`, `failed`) and reports by name. Do not catch inside, unless a
   partial result is meaningful. Do not put secrets or personal data in the returned counts.
4. **Know the lock.** An operation never runs twice at once: the runner holds an advisory lock per
   operation name across all instances, and a call that finds the previous run still going reports
   the operation as `skipped` and does not wait. A slow job therefore needs no guard of its own,
   but it must still finish before it is useful to run again.
5. **Register it** in `lib/scheduled/registry.ts`. If its cadence has no operation yet, also:
   - add the line to `ops/gcp/heartbeats.json` (`daily` 88200s, `hourly` 9000s, `every-5-min`
     900s: the interval with room for one late call), or a test fails, and run `pnpm gcp:alerts`;
   - add the scheduled task in the host, with the cron of that cadence (`0 * * * *`, `*/5 * * * *`).

   The runner writes the last run to the health panel and logs the `heartbeat` line by itself.
6. **Test it against a real database** like `tests/integration/scheduled.test.ts`: what it touches,
   what it leaves alone, the boundary of the date rule, and the second run doing nothing.
7. **Anything that e-mails** goes through the e-mail port and must record that it sent, in the same
   transaction, so the next run does not send again. Respect the person's e-mail preference once
   the base has one.
