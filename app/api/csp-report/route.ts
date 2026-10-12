import type { NextRequest } from "next/server";
import { currentInstant } from "@/domain/clock";
import { clientAddress } from "@/lib/client-address";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/ports/log";
import { consume } from "@/lib/rate-limit/service";
import { readViolations } from "@/lib/security/csp-report";
import { timedRoute } from "@/lib/timed-route";

const MAX_BYTES = 16_384;
// A page in a loop can report on every frame; past this, an address is dropped for the minute.
const reportsPerAddress = { name: "csp-reports", limit: 30, windowSeconds: 60 };

/** Where browsers send Content Security Policy violations. They are logged as warnings. */
export const POST = timedRoute("/api/csp-report", async (request: NextRequest) => {
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BYTES) {
    return new Response(null, { status: 413 });
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BYTES) {
    return new Response(null, { status: 413 });
  }
  const address = clientAddress(request.headers, env.TRUSTED_PROXY) ?? "unknown";
  if (!(await consume(db, reportsPerAddress, `address:${address}`, currentInstant())).allowed) {
    return new Response(null, { status: 429 });
  }
  let payload: unknown = null;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }
  for (const violation of readViolations(payload)) {
    logger.warn("csp violation", violation);
  }
  return new Response(null, { status: 204 });
});
