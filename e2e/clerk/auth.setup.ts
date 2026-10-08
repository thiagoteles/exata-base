import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { clerkKeys, hasClerkKeys } from "./keys";

const SESSION_FILE = "e2e/.auth/clerk.json";

/* Signs in once through Clerk's testing tokens and saves the session; the specs reuse it. */
setup("sign in through Clerk", async ({ page }) => {
  setup.skip(
    !hasClerkKeys,
    "Set CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY and E2E_CLERK_USER_EMAIL to run the Clerk suite.",
  );
  await clerkSetup();
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: clerkKeys.userEmail ?? "" });
  await page.context().storageState({ path: SESSION_FILE });
});
