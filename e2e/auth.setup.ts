import { expect, test as setup } from "@playwright/test";

const SESSION_FILE = "e2e/.auth/admin.json";
const WARM_UP_MS = 120_000;
const WARM_UP_TOTAL_MS = 600_000;

// Every page the suite opens. The development server compiles a page the first time it is asked
// for, and a test waits for the app, not for the compiler.
const PAGES = [
  "/",
  "/planos",
  "/contato",
  "/privacidade",
  "/termos",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/account",
  "/account/plan",
  "/account/messages",
  "/admin/numbers",
  "/admin/health",
  "/admin/users",
  "/admin/invites",
  "/admin/audit",
  "/staff/contacts",
  "/catalog",
  // Routes with no page: a GET compiles them, whatever it answers, so no test waits for the compiler.
  "/catalog/upload",
  "/descadastrar",
  "/api/unsubscribe",
  "/api/ingest/job-run",
  "/events/daily",
  // The rest of what tests reach first from two browsers at once: record pages by an address that
  // matches no record (they compile as they would for a real one), the end of every sign-in, the
  // account export, and the endpoints the browser and the providers call.
  "/staff/contacts/00000000-0000-0000-0000-000000000000",
  "/account/messages/00000000-0000-0000-0000-000000000000",
  "/catalog/files/00000000-0000-0000-0000-000000000000",
  "/auth/complete",
  "/account/export",
  "/api/auth/get-session",
  "/api/auth/verify-email",
  "/api/client-errors",
  "/api/csp-report",
  "/api/webhooks/stripe",
  "/api/webhooks/clerk",
  "/api/operations/reapply-deletions",
  "/events/hourly",
];

/* The seeded admin of the local compose signs in through the auth API; the session is saved. */
setup("sign in as the seeded admin", async ({ request }) => {
  setup.setTimeout(WARM_UP_TOTAL_MS);
  const response = await request.post("/api/auth/sign-in/email", {
    headers: { origin: "http://localhost:47300" },
    data: { email: "admin@app.local", password: "admin-local" },
  });
  expect(response.ok()).toBe(true);
  await request.storageState({ path: SESSION_FILE });
  // Compiling here keeps that wait out of the tests. One at a time: two browsers already share
  // one development server, and a burst of first compilations starves it. A page that does not
  // answer in time is not a failure of the setup: it only means that page is not warm, and the test
  // that opens it waits for it as before. Failing here would take every test down with one slow page.
  for (const path of PAGES) {
    await request.get(path, { timeout: WARM_UP_MS }).catch(() => undefined);
  }
});
