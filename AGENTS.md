<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This repository

**First task in a product: remove `BASE.md`.** `BASE.md` is the working memory of the base this project was created from. It ships with the base on purpose, and it must not stay in a product. Before any other work, compare `git remote get-url origin` with the repository address written in `BASE.md` (section 2). If they differ, or there is no `origin`, this is a product: run `git rm BASE.md`, commit that alone (`chore: remove the base notes`), and do not mention the file again. If they are the same, you are in the base itself: leave the file alone and keep it up to date as the base evolves.

A Next.js product with a typed, closed foundation: strict TypeScript, Biome with import boundaries, a closed design system, one text catalog, ports for everything that leaves the process. Read `DESIGN.md` before any visual work. If its Product block still says "TO FILL IN", run `pnpm setup:product` (it asks for the answers; to run it for the person, ask them first and pass the answers as flags with `--yes`) before any visual work.

### Where things go

| Folder | What lives there |
|---|---|
| `app/` | Routes only. Groups: `(public)` the site, `(auth)` sign-in screens, `(app)` the signed-in shell. A page is thin: it guards (`requirePageRole`), reads through a service, composes a feature. `app/api/` holds webhooks and browser reports, `app/events/` the daily call |
| `features/<area>/` | The screens and actions of one area (client forms, lists, record pages, `actions.ts`, `schema.ts`). A feature never imports another feature |
| `domain/<area>/` | Pure rules with no database, React, Next or Node: calculations, engines, value types. The lowest layer; `lib`, `features` and `components` import it, never the reverse. Held to 90% coverage on every `pnpm test`; an invariant gets a property test with `fast-check` (`*.property.test.ts`) |
| `lib/<area>/` | The rules of one area, against the database only, tested with an integration test. Services take the database and the actor as arguments |
| `lib/ports/<port>/` | Everything that leaves the process: `auth`, `email`, `storage`, `log`, `cep`, `payment`. Vendor SDKs are imported only in `adapters/` |
| `lib/db/schema/` | One file per area. Migrations are generated into `lib/db/migrations`, never edited |
| `components/ui/` | Primitives. The only place that imports Radix |
| `components/patterns/` | Lists, record grids, page header, save bar. Components receive data by props and never import the database or a port |
| `components/charts/` | Stat tile, sparkline, column chart, bar list, in plain SVG on the data palette. Every chart has a table view and hover and focus targets; see DESIGN.md, Data |
| `components/shell/` | The public and signed-in shells |
| `emails/` | E-mail components and their builders |
| `messages/pt-BR.json` | Every sentence a person reads. The file is the type of the catalog |
| `ops/`, `scripts/` | Alarm definitions for Google Cloud, the token generator, repository checks |

### Rules that do not bend

- **Text is a key in `messages/pt-BR.json`**, in screens, e-mails, errors and metadata. The one exception is long editorial text: MDX in `content/<locale>/<area>/`, with frontmatter checked by `pnpm content`, which writes the index the app reads (the list, the sitemap and the proxy's 404). A public dynamic route registers in `lib/known-pages.ts`, so a missing page is a real 404. No sentence in JSX. No em dash in interface text. Another language is a second catalog with the same keys and a line in `lib/i18n/locales.ts`; `pnpm check` compares them (see the README).
- **Colors and sizes are tokens.** `design.json` names a curated preset (with optional curated swaps under `adjust`), the color seeds and the accents; `pnpm tokens` regenerates the palette, the preset theme, the font module, the e-mail palette and the generated parts of `DESIGN.md`. No stock Tailwind color, hand-written value or free font.
- **Roles.** Pages use `requirePageRole(role, path)`, actions use `actionFor(role)`, routes use `requireRole`.
- **Plans.** What each tier grants lives in `domain/billing/catalog.ts` (features, limits, `extends`). Paid content is guarded by feature, never by tier name: `requireFeature(feature)` in pages and routes, `actionFor(role, { feature })` in actions. Rights belong to a holder (`{ kind: "user", id }` today). Reads that depend on who is looking take the viewer as an argument.
- **Deleting an account** is declared per table: `ownedBy()` deletes with the person, `authoredBy()` keeps the row and an author e-mail column.
- **Money is integer cents. Instants are `timestamptz`. Code that reads the clock gets it as a parameter.** Only an entry point (a page after `connection()`, an action, a route, an auth callback) reads it, once, with `currentInstant()` from `@/domain/clock`; a Biome plugin refuses `new Date()`, `Date.now` and `Math.random` everywhere else, and a test refuses silencing it. Randomness is a parameter too, so a test can seed it.
- **Public addresses are in Portuguese, routes in English.** `lib/i18n/public-paths.ts` maps each public route to the address a visitor sees; the proxy serves it and sends the route address there with a 301. Link with `publicHref(route)`, never the route written by hand (a test refuses it). The signed-in area and sign-in screens keep their route addresses.
- **Cache by tag.** A public read that may be cached uses `'use cache'` with `cacheLife` and a tag from `lib/cache-tags.ts`; the write that changes it calls `updateTag(tag)` in a server action or `revalidateTag(tag, "max")` in a route handler. An action that only changes what the writer sees calls `refresh()`. `revalidatePath` and `unstable_cache` are refused by a test.
- **Security headers.** Fixed ones live in `lib/security/headers.ts` (a product opens a browser feature there, such as `microphone: "self"`). The Content Security Policy is built per request from what each part declares in `lib/security/sources.ts`, sent as Report-Only; violations reach the log through `/api/csp-report`. Loading something new in the browser means declaring its origin there.
- **Environment variables** are read only in `lib/env.ts`. There is no `NEXT_PUBLIC_` variable.
- **Comments** explain why, never name a file.

### Commands

- `docker compose up` starts the app on http://localhost:3300 with Postgres and a mail catcher on http://localhost:8030. The seeded admin is `admin@app.local` with the password `admin-local`.
- `pnpm check` is typecheck, lint, tokens, migrations, unused code and unit tests. It runs on every commit.
- Every push runs the production build and `pnpm check:prerender` (every page still prerendered and in the standalone output). There is no CI.
- `pnpm verify` is the full proof before delivering a phase: check, integration, the production image booting against a throwaway Postgres, and the browser suite on a clean compose. Stop the local compose first.
- `pnpm test:integration` runs the rules against a real Postgres. `pnpm test:e2e` runs the browser suite against the running compose.
- `pnpm db:generate` writes a migration after a schema change.

### Skills

Recipes live in `.claude/skills`: `new-table`, `new-list-and-record`, `new-action`, `new-text-key`, `new-email`, `new-daily-operation`, `new-payment-event`. Follow the recipe, then copy the pattern of the area it points to.
