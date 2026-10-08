---
name: new-table
description: Add a domain table to the database. Use when a feature needs to store something new, or when asked for a new table, entity, model or column group.
---

# New table

Tables live in `lib/db/schema/`, one file per area. Read `lib/db/schema/contact.ts` and
`lib/db/schema/files.ts` before writing: they are the reference.

1. **Columns.** Start with `id()`, then the fields, then `createdAt()` and `updatedAt()` from
   `lib/db/columns.ts`. Name properties in camelCase English; the database casing makes them
   snake_case. Never pass a column name by hand. Use `instant()` for any point in time.
2. **Values.** A fixed set of values is a `pgEnum` with English values. The label a person reads
   comes from `messages/pt-BR.json`, never from the stored value. Money is an `integer` of cents.
3. **Keys to a user.** Never call `.references(() => users.id)` directly. Use
   `lib/db/schema/user-references.ts`:
   - `ownedBy()` when the row belongs to the person and must disappear with their account.
   - `authoredBy()` when the row is about someone else or the team and must stay. Add the
     author's e-mail next to it, named after the key (`reviewedBy` and `reviewedByEmail`,
     `actorId` and `actorEmail`), and always write both.
4. **Indexes.** Every foreign key gets `index().on(table.column)` unless it is already unique or
   the primary key. Add an index for the list's default filter and sort.
5. **Rules in the database.** What must always be true goes in a `check(...)`, like the lowercase
   e-mail in `lib/db/schema/users.ts`.
6. **Register it.** Add the table and its enums to `lib/db/schema.ts`. If it has an `ownedBy` key,
   add it to `exportedData` or `notExportedData` in `lib/db/personal-data.ts`, with the reason.
7. **Migrate.** Run `pnpm db:generate --name <what-changed>` and commit the SQL with the schema.
   Behavior the generator cannot express (a trigger, a function) goes in a custom migration:
   `pnpm db:generate --custom --name <what>`, like `0001_free_plan_on_signup.sql`.
8. **Prove it.** `pnpm check` runs `lib/db/conventions.test.ts`, which fails on a missing index,
   deletion policy, author e-mail or export decision, and `pnpm lint:migrations`, which fails when
   the schema changed without a migration. A rule the table enforces gets an integration test in
   `tests/integration/`, which runs against a real Postgres with `pnpm test:integration`.
