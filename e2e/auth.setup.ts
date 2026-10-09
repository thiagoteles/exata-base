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
  "/admin/users",
  "/admin/invites",
  "/admin/audit",
  "/staff/contacts",
  "/catalog",
];

/* The seeded admin of the local compose signs in through the auth API; the session is saved. */
setup("sign in as the seeded admin", async ({ request }) => {
  setup.setTimeout(WARM_UP_TOTAL_MS);
  const response = await request.post("/api/auth/sign-in/email", {
    headers: { origin: "http://localhost:3300" },
    data: { email: "admin@app.local", password: "admin-local" },
  });
  expect(response.ok()).toBe(true);
  await request.storageState({ path: SESSION_FILE });
  // Compiling here keeps that wait out of the tests. One at a time: two browsers already share
  // one development server, and a burst of first compilations starves it.
  for (const path of PAGES) {
    await request.get(path, { timeout: WARM_UP_MS });
  }
});
