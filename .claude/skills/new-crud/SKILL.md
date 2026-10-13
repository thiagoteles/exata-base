---
name: new-crud
description: Make a complete area of records a person keeps, or a child area filed under another (the pets of a person): table, rules, list, record, add and change form, delete, pages, text and tests. Use when a product needs to register something new (people, orders, pets, projects), before writing any of it by hand.
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
4. **A child area** (the animals of a person) is one command, once the parent exists:
   ```
   pnpm new:crud pets --entity Pet --label "Animais" --parent people
   pnpm db:migrate
   ```
   It writes the area from the second living sample (`sample-parts`, filed under `sample-items`):
   the table with the parent's id and a key that repeats the owner, so the database refuses a
   parent of another account; rules that refuse a missing parent (409, `<child>ParentMissing`),
   read the parent's name with every record and search by it; a form that picks the parent with
   `FormComboboxField` and starts under it when opened with `?parent=<id>`; an empty state that
   sends to the parent's form while the account has none; the parent's name as a link on the
   record and a column in the list; and the navigation entry right below the parent's. In the
   parent it adds only two lines to its record page: the import and the section that lists the
   children with the way to add another. The parent's delete already refuses while children point
   at it (409, `<parent>HasLinks`): every area is born that way.
   - The parent needs what every generated area has: a `name` column, the unique
     `(owner_id, id)`, `export type <Entity>Row` in its rules and its label in `nav.json`. The
     command checks and says what is missing before writing anything. A parent made before the
     unique existed gets it in a migration of its own first: drizzle-kit writes a new key before a
     new unique in one migration, and Postgres refuses that order.
   - When the parent's record page changed so much that the two lines have no place, the command
     prints them for you to place.
   - Text: the field that names the parent reads "Registro de <rótulo do pai>"; read
     `messages/pt-BR/<child>.json` once and make it sound like the product ("Tutor").
   - The child's tests create the parent straight in its table with only the owner and the name,
     so they hold whatever fields the parent gets; give them the parent's required columns if you
     add any without a default. The browser spec makes the parent through its form with only the
     name.
   - Count children with the table names written in full: inside a subquery Drizzle leaves a
     column unqualified. An icon that fits the domain is a name in `navIconNames` and its Tabler
     icon in the shell's icon map.

## The base itself

Both samples live in the base on purpose, as the templates: `sample-items` and `sample-parts`,
filed under it. After changing either, run `pnpm new:crud --sync-sample`: a test fails while a
template and its living sample differ. The template keeps the parent's record page without the
child's two lines. The first area a product makes removes both samples.
