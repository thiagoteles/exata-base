import type { NextRequest } from "next/server";
import { currentEpochMs, currentInstant } from "@/domain/clock";
import { clientAddress } from "@/lib/client-address";
import {
  browserKey,
  clientErrorSchema,
  createDeduper,
  fingerprint,
  MAX_REPORT_BYTES,
} from "@/lib/client-errors";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/ports/log";
import { consume } from "@/lib/rate-limit/service";
import { timedRoute } from "@/lib/timed-route";

const deduper = createDeduper();
// A browser stuck in an error loop is cut off here, before its reports fill the log.
const reportsPerAddress = { name: "client-errors", limit: 30, windowSeconds: 60 };

/** Errors that happened in a person's browser, written to the log as errors so the alert sees them. */
export const POST = timedRoute("/api/client-errors", async (request: NextRequest) => {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }
  const report = clientErrorSchema.safeParse(json);
  if (!report.success) {
    return new Response(null, { status: 400 });
  }
  const address = clientAddress(request.headers, env.TRUSTED_PROXY) ?? "unknown";
  if (!(await consume(db, reportsPerAddress, `address:${address}`, currentInstant())).allowed) {
    return new Response(null, { status: 429 });
  }
  const browser = browserKey(address, request.headers.get("user-agent") ?? "");
  if (deduper.firstTime(fingerprint(browser, report.data), currentEpochMs())) {
    // The report's own `message` would collide with the log line's, so it is logged as `errorMessage`.
    const { message, ...rest } = report.data;
    logger.error("browser error", { ...rest, errorMessage: message });
  }
  return new Response(null, { status: 204 });
});
