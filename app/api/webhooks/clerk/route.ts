import type { NextRequest } from "next/server";
import { currentInstant } from "@/domain/clock";
import { processClerkEvent } from "@/lib/accounts/clerk-webhook";
import { accountDeletionSteps } from "@/lib/accounts/deletion-steps";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { sendEvent } from "@/lib/ports/analytics";
import { readClerkWebhookRequest } from "@/lib/ports/auth";
import { logger } from "@/lib/ports/log";
import { timedRoute } from "@/lib/timed-route";

/** Clerk's user events. The signature is checked before anything is read or written. */
export const POST = timedRoute("/api/webhooks/clerk", async (request: NextRequest) => {
  let event: Awaited<ReturnType<typeof readClerkWebhookRequest>>;
  try {
    event = await readClerkWebhookRequest(request);
  } catch (error) {
    logger.warn("clerk webhook refused: invalid signature", { error });
    return new Response(null, { status: 400 });
  }
  if (event === null) {
    // Local mode, or no signing secret: the route exists but accepts nothing.
    return new Response(null, { status: 404 });
  }
  const result = await processClerkEvent(db, event, {
    adminEmails: env.ADMIN_EMAILS,
    deletion: accountDeletionSteps,
    now: currentInstant(),
    onSignedUp: (accountId) => sendEvent({ name: "signup_completed", accountId, data: {} }),
  });
  return Response.json({ result });
});
