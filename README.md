# Product name

TO FILL IN: one sentence on what the product does and who it is for.

## Start

```sh
docker compose up
```

Open http://localhost:3300. Sign in as the seeded admin, `admin@app.local` with the password `admin-local`. Mail the app sends appears at http://localhost:8030. No `.env` file is needed: every local value is set in `docker-compose.yml`.

Do not put anything in `.env.local` while using the compose. The app runs in dev mode on a mounted folder, and a non-empty `.env.local` sends it into a reload loop: every page recompiles on each request, the CPU stays at 100% and the browser tests time out. To try a provider (Stripe, Clerk, Google) keep its keys in a file that is not named `.env.local`, and pass them to the compose with an extra file: `docker compose -f docker-compose.yml -f extra.yml up -d --force-recreate app`, where `extra.yml` sets `services.app.environment`. Run the Clerk suite with the keys exported in your shell instead (see Checks).

Node 24 and pnpm are needed only outside Docker (`nvm use`, then `pnpm install`).

## Make it yours

1. **Start.** `docker compose up`, as above.
2. **Say what the product is.** `pnpm setup:product` asks for the name, one sentence about it, who it is for, its tone, the surfaces it uses, the visual preset (`instrument`, `editorial`, `accessible` or `vivid`, described in `DESIGN.md`) and the brand color (hue and chroma). It writes them where they live (the text catalog, `package.json`, this README, `DESIGN.md`, `design.json`), regenerates the palette for both themes, the preset theme, the fonts and the e-mail colors, and runs `pnpm check`. Run it again any time to correct a value; pass the answers as flags with `--yes` to skip the questions (the flags are `--name`, `--description`, `--audience`, `--tone`, `--surfaces`, `--preset`, `--hue`, `--chroma` and `--no-check`). It then asks which outside services the product uses (Clerk or its own sign-in, Google sign-in, Stripe, Mailtrap, Google Cloud files and logs, Umami), checks the shape of every key (prefixes, groups that must be filled together, at least one Stripe price) and keeps the answers in `.env.integrations`, a file git ignores. It generates the secrets you should not invent (`CRON_SECRET`, `BETTER_AUTH_SECRET`, `FILE_URL_SECRET`). Copy that file's lines into the hosting panel; nothing secret is written to a tracked file, and the file is deliberately not `.env.local` (see Start). From flags, pass each value with `--set NAME=value`, repeated. The variables themselves are in [Variables](#variables).
3. **Add a language.** The product ships in Brazilian Portuguese only, and `messages/pt-BR.json` is the type of the catalog. To add English: create `messages/en-US.json` with exactly the keys of `pt-BR.json`, add `"en-US"` to the list in `lib/i18n/locales.ts`, and add `export const instant = false;` to `app/layout.tsx` (with several languages the language comes from the request, so the document renders per request and the build must be told). `pnpm check` compares every catalog with `pt-BR.json` (missing key, extra key, changed `{argument}`) and fails if the layout and the list disagree, naming the fix. Then:
   - Portuguese stays at the clean address; English lives under `/en`. The language is chosen by the prefix, then the saved choice, then the browser's `Accept-Language`, then Portuguese. A page load with no prefix and another language chosen is redirected to its prefix.
   - A switcher appears in the footer and on the account page. The choice is saved in a cookie and, when signed in, in the person's options, so it follows them to another browser.
   - E-mails go out in the recipient's language: the one saved in their account, else the one they were using when the message was caused (the contact form stores it on the message). The team notice stays in the default language. Dates and money keep the Brazilian format by design (`dd/mm/aaaa`, BRL).
4. **Publish.** See [Publishing](#publishing).

## What is already built

- **Accounts.** Sign-up, e-mail confirmation, password reset, roles `member`, `staff` and `admin`, profile, theme, data export as a ZIP, and account deletion that removes what the person owns and keeps an audit trail.
- **Auth mode.** `AUTH_PROVIDER=local` runs on the app's own tables (better-auth, optional Google). `AUTH_PROVIDER=clerk` (the default in production) uses Clerk and keeps the user row in sync by webhook. Pages, actions and routes see only the auth port.
- **Admin.** Users (role, courtesy plan, refund, delete), invites by e-mail, and the audit log of everything staff and admins wrote.
- **Billing.** Stripe checkout for monthly, yearly and lifetime plans, customer portal, cancel at the end of the period, refunds, and a guard (`requirePaidPlan`). It stays off until the Stripe variables exist.
- **Contact.** A public form, a staff inbox with search and filters, replies by e-mail, and the member's own messages.
- **Files.** Private uploads on disk, or on Google Cloud Storage when its variables exist. Files open through short-lived signed links.
- **A showcase** at `/catalog` (staff only): every component, a multi-step form with masks and the address lookup, lists, and the upload.

## The shape of the code

`AGENTS.md` is the map: where a page, a feature, a rule or an adapter goes, the rules that do not bend, and the recipes in `.claude/skills` for a new table, list, action, text, e-mail, daily operation or payment event. Those files are written for coding agents and read well for people too.

Useful facts:

- **Options per person** live in the `jsonb` column `users.options` (theme today). Add a key to the `UserOptions` type; it needs no migration.
- **Page header.** Every signed-in page opens with `PageHeader` (title, subtitle, back button, actions).
- **A new sentence** is a key in `messages/pt-BR.json`. The compiler rejects a key that does not exist.
- **Git hooks.** Lefthook runs `pnpm check` before every commit.

## Checks

| Command | What it proves |
|---|---|
| `pnpm check` | Types, Biome (import boundaries included), design tokens, migrations, unused code, unit tests |
| `pnpm test:integration` | The rules against a real Postgres (needs Docker) |
| `pnpm test:e2e` | The browser suite against the running compose (two workers), with accessibility checks in both themes |
| `pnpm test:clerk` | The Clerk mode, with development keys (see `e2e/clerk`) |

The Clerk suite needs a server started with `AUTH_PROVIDER=clerk` and these variables exported in the shell that runs it: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and `E2E_CLERK_USER_EMAIL`, the e-mail of a user that already exists in that development instance. Use keys from a development instance only.

The GitHub workflow in `.github/workflows/ci.yml` is present and turned off. To turn it on, replace its `workflow_dispatch` trigger with `push` and `pull_request`.

## Publishing

The image is built from the `Dockerfile` with no build argument and no secret; every value is read when the container starts. The server migrates the database before it answers, so there is no pre-deploy step. In production there is no seed: the first admin signs up with an e-mail listed in `ADMIN_EMAILS`.

On Coolify:

1. Create a **Postgres resource** and turn on its **scheduled backup** to a bucket. The product ships no backup script: the host owns backups.
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

   The container image has BusyBox `wget`, which has no `--method` option; `--post-data=''` makes the request a POST. Each address accepts only a POST with that header and refuses everything when `CRON_SECRET` is not set. `/events` answers the same as `/events/daily`, for hosts set up before the cadences existed.
4. Optional: `GCP_PROJECT=... ALERT_EMAIL=... pnpm gcp:alerts` creates (or updates) the Google Cloud alarm that e-mails you when the app logs an error. It needs `gcloud` signed in and is safe to run again.

### Variables

The environment module `lib/env.ts` is the source of truth; production refuses to boot if a required one is missing or a group is half filled.

| Variable | Needed | Notes |
|---|---|---|
| `APP_URL` | yes | Public address. Base of e-mail links, Open Graph and the Stripe return |
| `DATABASE_URL` | yes | The Postgres connection string |
| `AUTH_PROVIDER` | no | `clerk` (default) or `local` |
| `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | with `clerk` | Point the Clerk webhook at `/api/webhooks/clerk` |
| `BETTER_AUTH_SECRET` | with `local` | At least 32 characters |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no | Together; turns on Google in `local` mode |
| `ADMIN_EMAILS` | no | Comma list. These addresses become `admin` when confirmed |
| `TRUSTED_PROXY` | no | `traefik` (default, Coolify alone) or `cloudflare` (Cloudflare in front). Decides which header carries the client address for rate limits. With `cloudflare`, let only Cloudflare's addresses reach the server |
| `MAILTRAP_TOKEN`, `MAILTRAP_INBOX`, `EMAIL_FROM` | no | Without a token nothing is sent and each send is logged as an error. `EMAIL_FROM` is required with the token |
| `CONTACT_EMAIL` | no | Comma list that is told about new contact messages |
| `INGEST_SECRETS` | no | `source=secret` pairs, at least 32 characters each, one per source a worker outside the server may deliver to (`POST /api/ingest/<source>`). Without a pair that source answers 401 |
| `CRON_SECRET` | no | At least 32 characters. Without it the scheduled calls (`/events/...`) refuse everything |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | no | Together. Point the Stripe webhook at `/api/webhooks/stripe` and send `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `charge.succeeded` and `charge.refunded` |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PRICE_LIFETIME` | no | Each price you sell. Only a filled price is shown |
| `GCP_CREDENTIALS`, `GCP_PROJECT`, `GCS_BUCKET` | no | All three. The service account JSON in base64; turns on Cloud Logging and Cloud Storage (a private bucket with uniform access) |
| `FILE_URL_SECRET` | without a bucket | At least 32 characters. Signs file links when files are on disk |
| `UMAMI_WEBSITE_ID`, `UMAMI_SCRIPT_URL` | no | Together. Turns on analytics. `pnpm umami setup` creates the website and prints both (see Analytics) |
| `GOOGLE_SITE_VERIFICATION` | no | The token of Search Console's meta tag method; shown on the home page |
| `ACCESS_LOG` | no | `on` for a product run for profit: one access record per request (address, source port when known, time, path), as the Marco Civil asks. Kept 183 days in a log of its own: run `pnpm gcp:access-log` once. Outside Google Cloud the lines go to stdout, and keeping them is the operator's job |
| `SOURCE_COMMIT`, `SERVICE_NAME` | no | The deployed commit (Coolify fills it) and the service name (`app`); Error Reporting groups errors by both |
| `UPLOAD_MAX_MB`, `UPLOAD_TYPES` | no | Upload limit (10) and accepted types |

## Backup and restore

The database is backed up by the hosting platform: in Coolify, a scheduled backup of the Postgres resource, once a day. Keep it for the period your privacy policy promises (7 days unless the product says otherwise): a longer one keeps deleted people's data longer. Files are not in that backup; on Cloud Storage, turn on soft delete for the bucket (`gcloud storage buckets update gs://BUCKET --soft-delete-duration=7d`).

**Drill, once a month.** `pnpm restore:drill path/to/backup.dmp` restores the file into a throwaway Postgres, applies the migrations it lacks and counts every table; it fails when the copy has no users. It reads the custom format Coolify writes and plain SQL, gzipped or not.

**Restoring for real.**
1. Restore the backup into a new Postgres resource and point the app's `DATABASE_URL` at it. The app migrates it on start.
2. Accounts deleted after the backup was taken are back. List their former ids: from the failed database, `select former_user_id from account_deletions where created_at > '<backup time>'`; if it is gone, from Cloud Logging, the lines whose message is `account deleted` (`jsonPayload.formerUserId`).
3. Put one id per line in a file and run `APP_URL=... CRON_SECRET=... pnpm restore:reapply ids.txt`. The app deletes each again with its usual steps and records it in the deletion trail as the restore.

## Alarms

`pnpm gcp:alerts` (with `GCP_PROJECT`, `ALERT_EMAIL` and `APP_URL`) creates or updates, in Google Cloud:
- **Error Reporting** reads the ERROR lines, groups them by stack (or by message when there is none) and per deployed version (`SOURCE_COMMIT`). Turn its notifications on in the console: it writes once per new kind of error, and again when a resolved one comes back.
- **Error storm:** an e-mail when more than 20 errors arrive in five minutes.
- **Job stopped:** one per job in `ops/gcp/heartbeats.json`, when a job's `heartbeat` line is missing for longer than its window. A product that adds a scheduled job adds a line there.
- **App down:** `/health` checked every minute from three regions.

`DRY_RUN=1` prints the gcloud commands without running them.

## Analytics

Umami, with no cookie and no personal data: events are declared in `lib/analytics-events.ts`, and only the internal account id identifies a person. `pnpm umami` talks to the Umami server and prints JSON, so a person or an AI agent can drive it (the `umami` skill is the recipe). Put the admin credentials in `.env.umami`, which git ignores (`UMAMI_URL`, `UMAMI_USERNAME`, `UMAMI_PASSWORD`, or `UMAMI_API_KEY` for Umami Cloud); they never go to the hosting panel.

- `pnpm umami setup --domain <host>` finds or creates the website and the standard reports (full and purchase funnels, goals, revenue, retention, paths), and prints the two variables for the app. Run it again any time; it only creates or corrects.
- `pnpm umami events`, `stats`, `properties` and `run --type <report>` read what arrived.
- `pnpm umami share --on` gives the dashboard a public read-only link.
- `pnpm umami api <METHOD> <path> [json]` reaches any other endpoint.

## Scheduled operations

A call to `/events/<cadence>` (`daily`, `hourly` or `every-5-min`) runs every operation in `lib/scheduled/registry.ts` that declared that cadence, one at a time. One failing is logged and does not stop the others, and an operation whose previous run is still going is skipped instead of running twice (a lock in Postgres, across instances). Each operation is idempotent, so running a cadence twice is safe. The first two, both daily, delete invites that were never accepted and expired more than 30 days ago, and the rate limit counters of windows that already ended. A new one is a new entry in the registry (see the `new-scheduled-operation` skill), never a new route.

A job that runs on another machine does not go through the registry: its worker delivers to `POST /api/ingest/<source>` with the secret of that source (`INGEST_SECRETS`), and the server validates and applies what arrives (see the `new-ingest-source` skill). The one source the base ships, `job-run`, lets such a worker report that a run ended, so the health panel and the absence alarm cover it too.

Every run writes a `heartbeat` log line named after its cadence and its last run to the health panel in the admin. A cadence that has operations needs a line in `ops/gcp/heartbeats.json` (a test checks), which `pnpm gcp:alerts` turns into the alarm that fires when the host stops calling.

## Errors

A page that breaks shows an error screen with a code. The code is the same digest the server wrote to the log. Errors in the browser are reported to `/api/client-errors` (JSON up to 8 KB, one write per minute for the same error from the same browser) and logged with severity ERROR, where the alarm sees them.
