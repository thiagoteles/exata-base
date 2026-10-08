import { expect, test as setup } from "@playwright/test";

const SESSION_FILE = "e2e/.auth/admin.json";
const WARM_UP_MS = 120_000;

/* The seeded admin of the local compose signs in through the auth API; the session is saved. */
setup("sign in as the seeded admin", async ({ request }) => {
  const response = await request.post("/api/auth/sign-in/email", {
    headers: { origin: "http://localhost:3300" },
    data: { email: "admin@app.local", password: "admin-local" },
  });
  expect(response.ok()).toBe(true);
  await request.storageState({ path: SESSION_FILE });
  // The development server compiles a route the first time it is asked for. Compiling here keeps
  // that wait out of the tests, whose timeouts are for the app, not for the compiler.
  await request.get("/catalog", { timeout: WARM_UP_MS });
});
