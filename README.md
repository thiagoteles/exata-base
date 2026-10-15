# Product name

TO FILL IN: one sentence on what the product does and who it is for.

## Start

```sh
docker compose up
```

Open http://localhost:47300. Sign in as the seeded admin, `admin@app.local` with the password `admin-local`. Mail the app sends appears at http://localhost:47030. No `.env` file is needed: every local value is set in `docker-compose.yml`.

- **Ports** live in `ports.json`, and every script and spec reads them from there. `pnpm setup:product --ports 47310` gives a product its own block (app 47310, Postgres 47450, mail 47040), so it runs beside the base or another product.
- **Memory.** The development server keeps every route it has compiled, and the compose gives it an 8 GB heap, which needs 12 GB for Docker (Docker Desktop, Settings, Resources). With Docker's default of 7.7 GB, lower `NODE_OPTIONS` in `docker-compose.yml` to `--max-old-space-size=4096`. Two composes at once want 16 GB.
- **Packages** are installed in the image (`Dockerfile.dev`) and the code is mounted over it. After a change to `package.json` or the lockfile: `docker compose up --build --renew-anon-volumes`.
- **Keys.** The compose mounts an empty file over `.env.local`, so the keys you keep there for running outside Docker never reach the container, and mail keeps going to the catcher. To try a provider (Stripe, Clerk, Google) in the compose, pass its keys with an extra file: `docker compose -f docker-compose.yml -f extra.yml up -d --force-recreate app`, where `extra.yml` sets `services.app.environment`.
- Node 24 and pnpm are needed only outside Docker (`nvm use`, then `pnpm install`).

## A new product

1. **Make it.** `pnpm create next-app my-product --example "https://github.com/thiagoteles/exata-base"`. It installs the packages before `git init`, so the product has no git hooks yet: run `pnpm check` once, which installs them, before the first commit.
2. **Tie it to the base.** After the first commit: `git remote add base https://github.com/thiagoteles/exata-base.git`, then `pnpm base:update --since $(git ls-remote base main | cut -f1)`, which records that the product already holds the base as it was made (a product from `create-next-app` starts with no history in common with the base). `BASE.md` stays: it is the base's notes, inert in a product, and keeping it lets the base's updates merge cleanly.
3. **Say what it is.** `pnpm setup:product`, below.
4. **Bring it up.** `docker compose up`, on the product's own ports.
5. **Make its areas.** `pnpm new:crud people --entity Person --label "Pessoas"` writes the table, the rules, the list, the record, the form, the delete, the pages, the text, the navigation and the tests, and takes the place of the base's samples. `pnpm new:crud pets --entity Pet --label "Animais" --parent people` writes an area whose records are filed under one of the first, with the children listed on the parent's page. Then change the fields in two migrations (add the new ones and `pnpm db:generate`, remove the old ones and `pnpm db:generate` again) and `pnpm db:migrate`, with no restart. The `new-crud` skill has the details.
6. **Say what activation is.** Replace the first steps in `domain/onboarding/steps.ts`; a step the app finishes (the first record saved) is `byApp`, and the product's action calls `finishOnboardingStep` when it happens.
7. **Open what programs may do.** A new scope in `domain/api/tokens.ts`, a route with `apiRoute` or `apiWrite` under `app/api/v1/`.
8. **Paper, if it needs it.** A sheet page under `app/(print)/print/` with the same guard and read as its screen.
9. **Prove it.** `pnpm verify` before delivering.
10. **Publish.** See [Publishing](#publishing).

### Updates from the base

`pnpm base:update` merges what changed in the base since the last update: it fetches the remote `base`, merges `base/main`, keeps deleted what the product deleted on purpose (the samples it replaced), regenerates the generated files from the product's own sources (`pnpm messages`, `pnpm tokens`), and commits, which runs the check. What it cannot settle it lists; settle it, run `pnpm tokens`, and commit.

What keeps the merge quiet is that a product never edits a file of the base. What it declares lives in the `*.product.*` file beside each registry (its tables, destinations, public pages, plans, environment, scheduled jobs; `AGENTS.md` lists them), and the files that are wholly the product's (this README, `design.json`, `ports.json`, the home page, its words) are marked `merge=ours` in `.gitattributes`, so where both sides changed one, the product's version stays. A product that needs a base file changed changes it in the base, and merges.

### Setting up the product

`pnpm setup:product` asks for the name, one sentence about it, who it is for, its tone, the surfaces it uses, how many days to keep the daily database backup (written in this README and in the privacy policy), the local ports, the visual preset (`instrument`, `editorial`, `accessible` or `vivid`, described in `DESIGN.md`) and the brand color (hue and chroma). It writes them where they live (the text catalog, `package.json`, this README, `DESIGN.md`, `design.json`, the compose and the documents that name a port), regenerates the palette for both themes, the preset theme, the fonts and the e-mail colors, and runs `pnpm check`. Run it again any time to correct a value. `pnpm setup:product --help` lists the flags; with `--yes` it asks nothing.

When the preset or the color changes, the catalog references in `e2e/__snapshots__` show the old look: with the compose up, run `pnpm test:e2e e2e/catalog-snapshots.spec.ts --update-snapshots`, look at the new pictures and commit them. The command says so when it applies.

It then asks which outside services the product uses (Clerk or its own sign-in, Google sign-in, Stripe, Mailtrap, Google Cloud files and logs, Umami), checks the shape of every key (prefixes, groups that must be filled together, at least one Stripe price) and keeps the answers in `.env.integrations`, a file git ignores. It generates the secrets you should not invent (`CRON_SECRET`, `UNSUBSCRIBE_SECRET`, `BETTER_AUTH_SECRET`, `FILE_URL_SECRET`). Copy that file's lines into the hosting panel; nothing secret is written to a tracked file. From flags, pass each value with `--set NAME=value`, repeated. The variables themselves are in [Variables](#variables).

### Adding a language

The product ships in Brazilian Portuguese only, and `messages/pt-BR.json` is the type of the catalog. To add English:

1. Create `messages/en-US/` with the same area files and keys as `messages/pt-BR/` (`pnpm messages` joins them into `messages/en-US.json`).
2. Add `"en-US"` to the list in `lib/i18n/locales.ts`, with its entry in `localeStatus`.
3. Add `export const instant = false;` to `app/layout.tsx`: with several languages the language comes from the request, so the document renders per request.

`pnpm check` compares every catalog with `pt-BR.json` (missing key, extra key, changed `{argument}`) and fails if the layout and the list disagree, naming the fix. A language with `complete: false` can ship unfinished: `pnpm check` reports how much is left, and the app shows the Portuguese sentence wherever the language has none. Write money with `formatMoney(cents, currency, locale)` and dates with `formatInstantDate(instant, zone, locale)`, passing `await getLocale()` (or `useLocale()`).

- Portuguese stays at the clean address; another language lives under its prefix, at the route addresses (`/en/plans`). The language is chosen by the prefix, then the saved choice, then the browser's `Accept-Language`, then Portuguese.
- A switcher appears in the footer and on the account page. The choice is saved in a cookie and, when signed in, in the account.
- E-mails go out in the recipient's language: the one saved in their account, else the one they were using when the message was caused. The team notice stays in the default language. Dates and money keep the Brazilian format in the default language.

## What is already built

- **Accounts.** Sign-up, e-mail confirmation, password reset, roles `member`, `staff` and `admin`, profile, theme and appearance preferences, signed-in devices, personal API tokens, invitations by link, data export as a ZIP, and account deletion that removes what the person owns and keeps an audit trail.
- **Auth mode.** `AUTH_PROVIDER=local` runs on the app's own tables (better-auth, optional Google). `AUTH_PROVIDER=clerk` (the default in production) uses Clerk and keeps the user row in sync by webhook. Pages, actions and routes see only the auth port.
- **Admin.** Users (role, courtesy plan, refund, delete), invites by e-mail, the audit log, the numbers page and the health panel.
- **Billing.** Stripe checkout for monthly, yearly and lifetime plans, Pix, trial, customer portal, cancel at the end of the period, refunds, receipts as verifiable PDFs, and guards by feature and by limit. It stays off until the Stripe variables exist.
- **Contact.** A public form, a staff inbox with search and filters, replies by e-mail, and the member's own messages.
- **Files.** Private uploads on disk, or on Google Cloud Storage when its variables exist. Files open through short-lived signed links.
- **Areas of records.** A sample area and a child area under it, which `pnpm new:crud` copies into the product's own.
- **A showcase** at `/catalog` (staff only): every component, a multi-step form with masks and the address lookup, lists, charts, figures and the upload.

## The shape of the code

`AGENTS.md` is the map: where a page, a feature, a rule or an adapter goes, the rules that do not bend, and the recipes in `.claude/skills`. Those files are written for coding agents and read well for people too.

- **Preferences per person** are declared in `lib/preferences/definitions.ts`, each with a schema and a fallback, and kept in `users.options` with no migration.
- **Page header.** Every signed-in page opens with `PageHeader` (title, subtitle, back button, actions).
- **A new sentence** is a key in `messages/pt-BR/<area>.json` (`pnpm messages` joins the areas into `messages/pt-BR.json`; the development server keeps it fresh). The compiler rejects a key that does not exist.
- **Git hooks.** Lefthook runs `pnpm check` before every commit, and the production build and `pnpm check:prerender` before every push. The first `pnpm check` (or `pnpm hooks`) installs them.

## Checks

| Command | What it proves |
|---|---|
| `pnpm check` | Types, Biome (import boundaries included), design tokens, migrations, unused code, unit tests |
| `pnpm test:integration` | The rules against a real Postgres (needs Docker) |
| `pnpm test:e2e` | The browser suite against the production build: it swaps the compose's app for the production image on the same ports and database, runs, and puts the development server back. Accessibility checks in both themes. Arguments go to Playwright (`pnpm test:e2e e2e/account.spec.ts`) |
| `pnpm test:clerk` | The Clerk mode, with development keys (see `e2e/clerk`) |
| `pnpm verify` | Everything above, the production image booting, and an area and a child area generated in a fresh product. Stop the local compose first |

| Command | What it does |
|---|---|
| `pnpm new:crud <area> --entity <Entity> --label "<Rótulos>"` | Writes a complete area of records (table, rules, list, record, form, pages, text, tests) from the living sample; `--parent <area>` files it under another area |
| `pnpm db:generate --name <change>` | Writes a migration after a schema change |
| `pnpm db:migrate` | Applies pending migrations to the compose's database, without restarting the app |
| `pnpm catalog:presets` | Compares every preset with its catalog references; `--update` rewrites them |

The Clerk suite needs a server started with `AUTH_PROVIDER=clerk` and these variables exported in the shell that runs it: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and `E2E_CLERK_USER_EMAIL`, the e-mail of a user that already exists in that development instance. Use keys from a development instance only.

The GitHub workflow in `.github/workflows/ci.yml` is present and turned off. To turn it on, replace its `workflow_dispatch` trigger with `push` and `pull_request`.

## Publishing

The image is built from the `Dockerfile` with no secret, and every value is read when the container starts. The one build argument is Clerk's publishable key, in Clerk mode only. The server migrates the database before it answers, so there is no pre-deploy step. In production there is no seed: the first admin signs up with an e-mail listed in `ADMIN_EMAILS`.

On Coolify:

1. The database runs in the same stack (`postgres` in `docker-compose.production.yml`, on its own volume). Set `POSTGRES_PASSWORD` (letters and digits only) and turn on the **scheduled backup** Coolify offers for the stack's Postgres, to a bucket. The product ships no backup script: the host owns backups.
2. Create the app from this repository with `docker-compose.production.yml`. Set the variables below in the panel.
3. Add one **scheduled task** per cadence, running inside the app container. A product that only has daily operations needs only the first:

   ```sh
   # daily, at the hour you choose
   wget -qO- --header="Authorization: Bearer $CRON_SECRET" --post-data='' http://127.0.0.1:3000/events/daily
   # hourly (0 * * * *), only when an operation declares it
   wget -qO- --header="Authorization: Bearer $CRON_SECRET" --post-data='' http://127.0.0.1:3000/events/hourly
   # every five minutes (*/5 * * * *), only when an operation declares it
   wget -qO- --header="Authorization: Bearer $CRON_SECRET" --post-data='' http://127.0.0.1:3000/events/every-5-min
   ```

   The container image has BusyBox `wget`, which has no `--method` option; `--post-data=''` makes the request a POST. Each address accepts only a POST with that header and refuses everything when `CRON_SECRET` is not set. `/events` answers the same as `/events/daily`.
4. Optional: `GCP_PROJECT=... ALERT_EMAIL=... pnpm gcp:alerts` creates (or updates) the Google Cloud alarms (see [Alarms](#alarms)).

### Variables

The environment module `lib/env.ts` is the source of truth; production refuses to boot if a required one is missing or a group is half filled.

| Variable | Needed | Notes |
|---|---|---|
| `APP_URL` | yes | Public address. Base of e-mail links, Open Graph and the Stripe return |
| `POSTGRES_PASSWORD` | yes | The password of the stack's Postgres, letters and digits only. The compose builds `DATABASE_URL` from it, so `DATABASE_URL` is not set by hand in production |
| `AUTH_PROVIDER` | no | `clerk` (default) or `local` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | with `clerk` | The publishable key is public and goes to the build (in Coolify, tick it as a build variable): the prerendered pages carry Clerk's provider, so the image is for one Clerk instance. The other two are read at runtime. Point the Clerk webhook at `/api/webhooks/clerk` |
| `BETTER_AUTH_SECRET` | with `local` | At least 32 characters |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no | Together; turns on Google in `local` mode |
| `ADMIN_EMAILS` | no | Comma list. These addresses become `admin` when confirmed |
| `TRUSTED_PROXY` | no | `traefik` (default, Coolify alone) or `cloudflare` (Cloudflare in front). Decides which header carries the client address for rate limits. With `cloudflare`, let only Cloudflare's addresses reach the server |
| `MAILTRAP_TOKEN`, `MAILTRAP_INBOX`, `EMAIL_FROM` | no | Without a token nothing is sent and each send is logged as an error. `EMAIL_FROM` is required with the token |
| `CONTACT_EMAIL` | no | Comma list that is told about new contact messages |
| `INGEST_SECRETS` | no | `source=secret` pairs, at least 32 characters each, one per source a worker outside the server may deliver to (`POST /api/ingest/<source>`). Without a pair that source answers 401 |
| `API_ALLOWED_ORIGINS` | no | Exact origins (like `https://app.example.com`, no path) whose web pages may read the API answers at `/api/v1/*`. Empty means no browser page; a program with a token is not affected |
| `CRON_SECRET` | no | At least 32 characters. Without it the scheduled calls (`/events/...`) refuse everything |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | no | Together. The key is a secret one (`sk_`) or a restricted one (`rk_`), which needs write access to Checkout Sessions, Customers, the customer portal and Refunds. Point the Stripe webhook at `/api/webhooks/stripe` and send `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `charge.succeeded`, `charge.refunded` and `price.created`, `price.updated`, `price.deleted` (these three refresh the prices on the plans page); the `new-payment-event` skill lists every event the app handles. Prices are found by lookup key (`paid_monthly`, `paid_yearly`, `paid_yearly_once`, `paid_lifetime`, from `domain/billing/catalog.ts`): create them in Stripe with those keys and nothing else is configured |
| `GCP_CREDENTIALS`, `GCP_PROJECT`, `GCS_BUCKET` | no | All three. The service account JSON in base64; turns on Cloud Logging and Cloud Storage (a private bucket with uniform access) |
| `UNSUBSCRIBE_SECRET` | with real mail | At least 32 characters. Signs the unsubscribe link in reminders and newsletters; required once `MAILTRAP_TOKEN` is set |
| `DOCUMENT_SECRET` | with payments | At least 32 characters. Signs the address in the QR code of a receipt, so a visitor cannot invent one that looks real; required once `STRIPE_SECRET_KEY` is set |
| `FILE_URL_SECRET` | without a bucket | At least 32 characters. Signs file links when files are on disk |
| `UMAMI_WEBSITE_ID`, `UMAMI_SCRIPT_URL` | no | Together. Turns on analytics. `pnpm umami setup` creates the website and prints both (see Analytics) |
| `GOOGLE_SITE_VERIFICATION` | no | The token of Search Console's meta tag method; shown on the home page |
| `ACCESS_LOG` | no | `on` for a product run for profit: one access record per request (address, source port when known, time, path), as the Marco Civil asks. Kept 183 days in a log of its own: run `pnpm gcp:access-log` once. Outside Google Cloud the lines go to stdout, and keeping them is the operator's job |
| `SOURCE_COMMIT`, `SERVICE_NAME` | no | The deployed commit (Coolify fills it) and the service name (`app`); Error Reporting groups errors by both |
| `UPLOAD_MAX_MB`, `UPLOAD_TYPES` | no | Upload limit (10) and accepted types |
| `EMAIL_ATTACHMENTS_MAX_MB` | no | Total size of the files attached to one e-mail (10); over it the send is refused |

## Backup and restore

The database is backed up by the hosting platform: in Coolify, a scheduled backup of the stack's Postgres, once a day. Keep it for 7 days, the period the privacy policy promises (`pnpm setup:product` writes it in both places): a longer one keeps deleted people's data longer. Files are not in that backup; on Cloud Storage, turn on soft delete for the bucket (`gcloud storage buckets update gs://BUCKET --soft-delete-duration=7d`).

**Drill, once a month.** `pnpm restore:drill path/to/backup.dmp` restores the file into a throwaway Postgres, applies the migrations it lacks and counts every table; it fails when the copy has no users. It reads the custom format Coolify writes and plain SQL, gzipped or not.

**Restoring for real.**
1. Restore the backup into the stack's Postgres (Coolify restores a backup into it), or into a new Postgres whose address you give the app as `DATABASE_URL` in place of the one the compose builds. The app migrates it on start.
2. Accounts deleted after the backup was taken are back. List their former ids: from the failed database, `select former_user_id from account_deletions where created_at > '<backup time>'`; if it is gone, from Cloud Logging, the lines whose message is `account deleted` (`jsonPayload.formerUserId`).
3. Put one id per line in a file and run `APP_URL=... CRON_SECRET=... pnpm restore:reapply ids.txt`. The app deletes each again with its usual steps and records it in the deletion trail as the restore.

## Alarms

`pnpm gcp:alerts` (with `GCP_PROJECT`, `ALERT_EMAIL` and `APP_URL`) creates or updates, in Google Cloud, and is safe to run again:
- **Error Reporting** reads the ERROR lines, groups them by stack (or by message when there is none) and per deployed version (`SOURCE_COMMIT`). Turn its notifications on in the console: it writes once per new kind of error, and again when a resolved one comes back.
- **Error storm:** an e-mail when more than 20 errors arrive in five minutes.
- **Job stopped:** one per job in `ops/gcp/heartbeats.json`, when a job's `heartbeat` line is missing for longer than its window. A product that adds a scheduled job adds a line there. Applied before the first daily run, it fires once until the first heartbeat arrives.
- **App down:** `/health` checked every minute from three regions.

It needs `gcloud` signed in, with the `beta` and `alpha` components. `DRY_RUN=1` prints the gcloud commands without running them.

## Analytics

Umami, with no cookie and no personal data: events are declared in `lib/analytics-events.ts`, and only the internal account id identifies a person. `pnpm umami` talks to the Umami server and prints JSON, so a person or an AI agent can drive it (the `umami` skill is the recipe). Put the admin credentials in `.env.umami`, which git ignores (`UMAMI_URL`, `UMAMI_USERNAME`, `UMAMI_PASSWORD`, or `UMAMI_API_KEY` for Umami Cloud); they never go to the hosting panel.

- `pnpm umami setup --domain <host>` finds or creates the website and the standard reports (full and purchase funnels, goals, revenue, retention, paths), and prints the two variables for the app. Run it again any time; it only creates or corrects.
- `pnpm umami events`, `stats`, `properties` and `run --type <report>` read what arrived.
- `pnpm umami share --on` gives the dashboard a public read-only link.
- `pnpm umami api <METHOD> <path> [json]` reaches any other endpoint.

## Scheduled operations

A call to `/events/<cadence>` (`daily`, `hourly` or `every-5-min`) runs every operation in `lib/scheduled/registry.ts` that declared that cadence, one at a time. One failing is logged and does not stop the others, and an operation whose previous run is still going is skipped instead of running twice (a lock in Postgres, across instances). Each operation is idempotent, so running a cadence twice is safe. A new one is a new entry in the registry (see the `new-scheduled-operation` skill), never a new route.

A job that runs on another machine does not go through the registry: its worker delivers to `POST /api/ingest/<source>` with the secret of that source (`INGEST_SECRETS`), and the server validates and applies what arrives (see the `new-ingest-source` skill). The source `job-run` lets such a worker report that a run ended, so the health panel and the absence alarm cover it too.

Every run writes a `heartbeat` log line named after its cadence and its last run to the health panel in the admin. A cadence that has operations needs a line in `ops/gcp/heartbeats.json` (a test checks), which `pnpm gcp:alerts` turns into the alarm that fires when the host stops calling.

## Errors

A page that breaks shows an error screen with a code. The code is the same digest the server wrote to the log. Errors in the browser are reported to `/api/client-errors` (JSON up to 8 KB, one write per minute for the same error from the same browser) and logged with severity ERROR, where the alarm sees them.
