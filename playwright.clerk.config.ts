import { defineConfig, devices } from "@playwright/test";
import { appUrl } from "./e2e/clerk/keys";

/*
 * The Clerk-mode suite. It needs a server started with AUTH_PROVIDER=clerk and Clerk's development
 * keys, and the same keys in this environment. Without them the suite stops with a notice instead
 * of failing: the compose proof runs in the local mode, and this one is run by hand with keys.
 */

const SESSION_FILE = "e2e/.auth/clerk.json";

export default defineConfig({
  testDir: "e2e/clerk",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  use: { baseURL: appUrl, trace: "retain-on-failure" },
  projects: [
    { name: "clerk-setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "clerk",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["clerk-setup"],
      use: { ...devices["Desktop Chrome"], storageState: SESSION_FILE },
    },
  ],
});
