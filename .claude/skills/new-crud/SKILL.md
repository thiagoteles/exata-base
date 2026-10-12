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

1. **The fields.** The sample has name, code, status, due date and notes.
   Change the table, `lib/<area>/options.ts`, the input type in the rules, the form schema, the
   form, the record and the list together. A Brazilian field uses the schemas of
   `lib/validation-br.ts` inside `optional(...)` when it may stay blank, and its mask in
   `FormMaskedField`; a choice among the account's own records (a long list) is
   `FormComboboxField`.
   **Write the migration in two steps**: drizzle-kit asks "created or renamed?" whenever one
   migration both adds and removes columns, enums or tables, and that question needs a terminal
   (an agent gets `Interactive prompts require a TTY`). So first add the new columns and enums
   with the old ones still there and run `pnpm db:generate --name <area>-fields`, then remove the
   old ones and run `pnpm db:generate --name <area>-drop-sample-fields`. Neither asks anything, and
   a column is never renamed by accident. Then `pnpm db:migrate`.
2. **The text** is in `messages/pt-BR/<areaCamel>.json`. Read it once: it was written around the
   label.
3. **The tests** follow the fields: the integration test and the spec name the sample's fields.
4. **A child area** (the animals of a person) is a second `pnpm new:crud`, then:
   - **The table** gets the parent's id and a composite key with the owner repeated, so the
     database refuses a child filed under another account's parent. The parent already has the
     unique `(owner_id, id)` the key needs (every generated table is born with it):
     ```ts
     personId: uuid().notNull(),
     // ...
     index().on(table.personId),
     foreignKey({
       columns: [table.ownerId, table.personId],
       foreignColumns: [people.ownerId, people.id],
       name: "pets_person_fk",
     }),
     ```
     With no `onDelete` the parent cannot be deleted while it has children, and deleting the
     account still takes both (the check runs at the end of the cascade). If the parent table was
     made before it had that unique, add the unique in one migration and the key in the next:
     drizzle-kit writes a new key before a new unique and Postgres refuses that order.
   - **The rules**: create and update wrap the write in
     `refusingBrokenLinks("<childParentMissing>", ...)` and refuse a parent id that `isRecordId`
     rejects with the same key; the parent's delete wraps its delete in
     `refusingBrokenLinks("<parentHasChildren>", ...)`. Both keys go in `messages/pt-BR/errors.json`.
     Reads join the parent for its name (`innerJoin(people, eq(people.id, pets.personId))`), the
     list searches the parent's name too, and a `<children>Of<Parent>(db, viewer, scope, parentId)`
     read serves the parent's page.
   - **The form** receives the account's parents (a `<parent>Choices(db, viewer)` read in the
     parent's rules) and picks one with `FormComboboxField`. The new-child page reads
     `?<parent>=<id>` and starts the form under that parent when it is one of the account's, and
     shows an empty state with a link to the parent's form while the account has none.
   - **The parent's page** shows the children: a component in the child's feature (a feature
     never imports another feature; the page composes both) with a link to each child and one to
     the new-child form with the parent already chosen.
   - Count children with the table names written in full: inside a subquery Drizzle leaves a
     column unqualified.
   - The navigation lists the parent before the child (`lib/navigation.ts`); an icon that fits the
     domain is a name in `navIconNames` and its Tabler icon in the shell's icon map.

## The base itself

The sample lives in the base on purpose, as the template. After changing it, run
`pnpm new:crud --sync-sample`: a test fails while the template and the living sample differ.
