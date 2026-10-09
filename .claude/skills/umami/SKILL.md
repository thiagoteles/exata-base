---
name: umami
description: Set up, inspect or change the product's Umami analytics. Use when asked to configure analytics, create the Umami website, build funnels, goals or revenue reports, read visits and events, share the dashboard, or check that events arrive.
---

# Umami

Everything goes through `pnpm umami`, which prints JSON. Run `pnpm umami --help` for the list.

## Before anything

1. **Credentials.** The script reads `UMAMI_URL`, `UMAMI_USERNAME` and `UMAMI_PASSWORD` (or
   `UMAMI_API_KEY` for Umami Cloud, with `UMAMI_URL=https://api.umami.is/v1`) from the environment
   or from `.env.umami`, which git ignores. If they are missing, ask the person for them and offer
   to write `.env.umami`. Never put them in a tracked file, a flag or a commit message. They are
   admin credentials: they never go to the hosting panel.
2. **Check the connection** with `pnpm umami whoami`.

## A full setup

1. `pnpm umami setup --domain <the product's host> --name "<product name>"` finds the website
   for that host or creates it, then creates or corrects the standard reports: the full funnel and
   the purchase funnel (built from `funnel` in `lib/analytics-events.ts`), goals for sign-ups and
   payments, revenue (in BRL unless `--currency`), retention and paths. It is idempotent: run it
   again after changing the catalog's funnel. Reports made by hand in Umami are left alone.
2. Copy the two `environment` lines it prints (`UMAMI_WEBSITE_ID`, `UMAMI_SCRIPT_URL`) into the
   hosting panel. With them set, the app loads the script, identifies signed-in people, sends Web
   Vitals and sends the server's funnel events.
3. To show the dashboard to someone without an account: `pnpm umami share --on` (and `--off`).

## Checking that events arrive

- `pnpm umami events --days 1` lists event names and counts; `properties` lists their properties.
- `pnpm umami run --type funnel --parameters '{"window":10080,"steps":[...]}'` runs any report
  without saving it. Types: funnel, goal, journey, retention, revenue, utm, attribution, breakdown.
- A server event that never shows up was most likely dropped as a robot: Umami answers
  `{"beep":"boop"}` with a 200 to any user agent that is not a browser. The server adapter sends
  an empty one on purpose; look for `analytics event not sent` in the log.
- To test from Playwright, set a normal browser user agent: Umami drops `HeadlessChrome` too.
  Events sent while a page closes (INP, CLS) do not show in `page.on("request")`; count them in
  Umami instead.

## Anything else

`pnpm umami api <METHOD> <path> [json]` reaches any endpoint (teams, users, segments, website
settings). When unsure of a body, send `{}`: Umami answers 400 with each field it expected, by name.
A path that is not an API route answers with Umami's HTML page, which the script reports as such.

## What not to do

- Do not delete or reset a website without the person asking; both need `--yes` and cannot be
  undone.
- Do not add an event the catalog does not declare, and never a property with personal data. A new
  event goes in `lib/analytics-events.ts` first.
