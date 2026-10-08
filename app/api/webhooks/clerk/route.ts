import type { NextRequest } from "next/server";
import { processClerkEvent } from "@/lib/accounts/clerk-webhook";
import { accountDeletionSteps } from "@/lib/accounts/deletion-steps";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { readClerkWebhookRequest } from "@/lib/ports/auth";
import { logger } from "@/lib/ports/log";

/** Clerk's user events. The signature is checked before anything is read or written. */
export async function POST(request: NextRequest) {
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
  });
  return Response.json({ result });
}
