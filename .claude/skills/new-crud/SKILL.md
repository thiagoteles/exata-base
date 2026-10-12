---
name: new-crud
description: Make a complete area of records a person keeps: table, rules, list, record, add and change form, delete, pages, text and tests. Use when a product needs to register something new (people, orders, pets, projects), before writing any of it by hand.
---

# New area of records

`pnpm new:crud <area> --entity <Entity> --label "<Rótulos>"` writes a whole area from the base's
living sample (`sample-items`), which compiles, runs against Postgres and in the browser suite in
every `pnpm verify`, so what it writes passes the check untouched.

```
pnpm new:crud service-orders --entity ServiceOrder --label "Ordens de serviço"
pnpm db:migrate
```

- `<area>` is the address, plural, in kebab case. `--entity` is one record, in Pascal case.
  `--label` is the plural noun a person reads; the sentences are written around it
  ("Novo registro de ordens de serviço"), so no gender has to be guessed.
- It writes the table (`lib/db/schema/<area>.ts`, owned by the account, deleted with it, in the
  export), the rules (`lib/<area>/records.ts`: who sees what through `lib/access/rules.ts`, a
  duplicate code as 409, a change over an older version as 409), the form schema with optional
  fields, the actions, the list with search, filter, sort and paging in the address, the record,
  the form to add and change with the unsaved guard, the delete with its dialog, four pages, the
  text, the navigation entry, an integration test and a browser spec. Then it joins the catalog,
  formats, and writes the migration.
- The first area a product makes takes the sample's place (its files, its registry lines, a
  migration that drops its table). `--keep-sample` keeps it; `pnpm new:crud --remove-sample`
  takes it out alone.

## After it runs

1. **The fields.** The sample has name, code (unique in the account), status, due date and notes.
   Change the table, `lib/<area>/options.ts`, the input type in the rules, the form schema, the
   form, the record and the list together, then `pnpm db:generate --name <change>` and
   `pnpm db:migrate`. A Brazilian field uses the schemas of `lib/validation-br.ts` inside
   `optional(...)` when it may stay blank, and its mask in `FormMaskedField`.
2. **The text** is in `messages/pt-BR/<areaCamel>.json`. Read it once: it was written around the
   label.
3. **The tests** follow the fields: the integration test and the spec name the sample's fields.
4. A child record (the animals of a person) is a second area whose table points at the first with
   the owner repeated in a composite foreign key, so the database refuses a child filed under
   another account's parent. Count children with the table names written in full: inside a
   subquery Drizzle leaves a column unqualified.

## The base itself

The sample lives in the base on purpose, as the template. After changing it, run
`pnpm new:crud --sync-sample`: a test fails while the template and the living sample differ.
