"use server";

import { limitedPublicAction } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { applyUnsubscribe } from "@/lib/unsubscribe/service";
import { readUnsubscribe } from "@/lib/unsubscribe/token";
import { z } from "@/lib/validation";

const MAX_TOKEN = 1000;

/** The person confirmed on the page. Anyone with the link may, which is the point of the link. */
export const confirmUnsubscribe = limitedPublicAction({
  name: "unsubscribe",
  limit: 30,
  windowSeconds: 3600,
})
  .inputSchema(z.object({ token: z.string().min(1).max(MAX_TOKEN) }))
  .metadata({ name: "confirmUnsubscribe" })
  .action(async ({ parsedInput }) => {
    const statement = readUnsubscribe(env.UNSUBSCRIBE_SECRET, parsedInput.token);
    if (statement === null) {
      throw new DomainError(400);
    }
    await applyUnsubscribe(db, statement);
    return { done: true };
  });
