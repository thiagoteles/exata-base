import process from "node:process";

/* The Clerk suite needs a Clerk development instance and a test user; without them it stands down. */
export const clerkKeys = {
  publishableKey: process.env["CLERK_PUBLISHABLE_KEY"],
  secretKey: process.env["CLERK_SECRET_KEY"],
  userEmail: process.env["E2E_CLERK_USER_EMAIL"],
};

export const hasClerkKeys = Boolean(
  clerkKeys.publishableKey && clerkKeys.secretKey && clerkKeys.userEmail,
);

export const appUrl = process.env["APP_URL"] ?? "http://localhost:3300";
