---
name: new-daily-operation
description: Add something that must happen once a day, such as a cleanup, a reminder or a report. Use instead of a new route, queue or schedule.
---

# New daily operation

The reference is `lib/daily/purge-invites.ts`. There is one scheduled call for the whole product:
`POST /events`, made once a day by the host's scheduled task with `CRON_SECRET`. It runs every
operation in `lib/daily/registry.ts`. A new job is a new entry there, never a new route, a queue, a
worker or a cron inside the container.

1. **Write the operation** as a `DailyOperation`: a `name` and `run({ db, now })` that returns plain
   counts (`{ removed: 3 }`). Use `now` from the context, never `new Date()`, so a test can pick the day.
2. **Make it idempotent.** Running the whole registry twice on the same day must change nothing the
   second time. Write the condition so that what was done no longer matches (delete what is old,
   mark what was sent), not a counter that increments.
3. **Keep one failure from costing the rest.** The runner already catches, logs
   (`daily operation started`, `finished`, `failed`) and reports by name. Do not catch inside, unless
   a partial result is meaningful. Do not put secrets or personal data in the returned counts.
4. **Register it** in `lib/daily/registry.ts`.
5. **Test it against a real database** like `tests/integration/daily.test.ts`: what it touches, what
   it leaves alone, the boundary of the date rule, and the second run doing nothing.
6. **Anything that e-mails** goes through the e-mail port and must record that it sent, in the same
   transaction, so the next run does not send again.
