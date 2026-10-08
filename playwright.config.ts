import { defineConfig, devices } from "@playwright/test";

/*
 * The suite runs against the local compose, which must already be up: `docker compose up`.
 * The `setup` project signs in as the seeded admin once and saves the session; the others reuse it.
 */

const SESSION_FILE = "e2e/.auth/admin.json";
const FIRST_LOAD_MS = 90_000;
const EXPECT_MS = 15_000;

export default defineConfig({
  testDir: "e2e",
  testIgnore: /clerk\//,
  fullyParallel: true,
  // Two browsers share one development server; more of them starve it on a busy machine.
  workers: 2,
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  // The development server compiles a page the first time it is asked for.
  timeout: FIRST_LOAD_MS,
  // An expectation waits for the app, not for the compiler.
  expect: { timeout: EXPECT_MS },
  use: {
    baseURL: "http://localhost:3300",
    // The product speaks Portuguese; the browser asks for it like a person in Brazil would.
    locale: "pt-BR",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testIgnore: [/auth\.setup\.ts/, /responsive\.spec\.ts/, /clerk\//],
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: SESSION_FILE },
    },
    {
      name: "phone",
      testMatch: /responsive\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], storageState: SESSION_FILE },
    },
  ],
});
