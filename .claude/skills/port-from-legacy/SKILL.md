---
name: port-from-legacy
description: Bring code from another project into this base. Use when moving a module, screen, calculation, table or job from an older codebase, or when asked to migrate, port or absorb legacy code.
---

# Port from legacy

Code from outside arrives one file at a time and leaves the previous project's habits at the door.
Do the steps in order for each file, and run `pnpm check` before every commit. One area per
commit, so a port is reviewable and can be undone.

1. **Put it in the layer it belongs to.** Ask what the code needs, not what it is called:
   - no database, React, Next or Node, only calculation: `domain/<area>/`;
   - reads or writes the database: `lib/<area>/`, taking the database and the actor as arguments;
   - leaves the process (e-mail, payments, files, a vendor SDK): a port in `lib/ports/<port>/`;
   - a screen, a form or an action of one area: `features/<area>/`;
   - a reusable piece of interface: `components/ui`, `components/patterns` or `components/figures`;
   - something that must happen on a schedule: a daily operation (`new-daily-operation`);
   - a table: `new-table`, with the deletion policy and the export decision;
   - a script that is not the app (a converter, an analysis): `tools/`, not here.
2. **Take out what the base already does.** Sign-in, roles, plans, rate limits, logging, error
   reports, e-mail, analytics and file storage come from the base. Do not carry the old project's
   copy over; call the base's.
3. **Move the text to the catalog** (`new-text-key`). Notation that belongs to the domain (note
   names, codes, abbreviations) stays in a domain function and is not catalog text. No em dash.
4. **Take the clock and randomness out.** `new Date()`, `Date.now()` and `Math.random()` become
   parameters: an entry point reads the clock once with `currentInstant()` and passes it down, and
   random choices take a seeded generator so a test can fix them. A Biome plugin refuses the rest.
5. **Fix the data shapes.** Money is integer cents. Instants are `timestamptz`. Stored enum values
   are English `snake_case`. Environment variables are read only in `lib/env.ts`. Colors and sizes
   are tokens, never a stock Tailwind color or a hand-written value.
6. **Use the base's doors.** Actions are `actionFor(role)` with `.metadata({ name })`; routes are
   `timedRoute(...)` with a role check; pages guard with `requirePageRole`; public links go through
   `publicHref`; public reads that may be cached use `'use cache'` with a tag.
7. **Port the tests with the code,** and add what the base asks of that layer: unit tests for
   `domain/` (the folder is held to 90% coverage), a property test for each invariant (a sum that
   must match its total, a round trip that must return the start), an integration test for any rule
   that touches the database.
8. **Run `pnpm check`** and fix what it reports before committing. The checks are the review of the
   boring part.

What stays out of the base: tables that map the old project's names to the new ones (variables,
enums, routes), and scripts that move production data. They belong to the product's own
repository, or to its `tools/` folder, and they are written once and thrown away.
