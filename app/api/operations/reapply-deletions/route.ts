import type { NextRequest } from "next/server";
import { accountDeletionSteps } from "@/lib/accounts/deletion-steps";
import { reapplyDeletions } from "@/lib/accounts/reapply-deletions";
import { isAuthorizedCall } from "@/lib/daily/authorize";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/ports/log";

const MAX_BYTES = 1_048_576;
const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
 * After a backup is restored, the operator sends the former ids of accounts deleted since the
 * backup (one per line), and each is deleted again with the app's real steps. Authorized like the
 * daily call, with CRON_SECRET; `pnpm restore:reapply` sends the file.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCall(env.CRON_SECRET, request.headers.get("authorization"))) {
    return new Response(null, { status: 401 });
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BYTES) {
    return new Response(null, { status: 413 });
  }
  const ids = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (ids.some((id) => !uuidShape.test(id))) {
    return Response.json({ error: "every line must be a former user id" }, { status: 400 });
  }
  const result = await reapplyDeletions(db, accountDeletionSteps, ids);
  logger.info("deletions reapplied after a restore", result);
  return Response.json(result);
}
