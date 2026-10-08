import type { NextRequest } from "next/server";
import {
  browserKey,
  clientErrorSchema,
  createDeduper,
  fingerprint,
  MAX_REPORT_BYTES,
} from "@/lib/client-errors";
import { logger } from "@/lib/ports/log";

const deduper = createDeduper();

/** Errors that happened in a person's browser, written to the log as errors so the alert sees them. */
export async function POST(request: NextRequest) {
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
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const browser = browserKey(address, request.headers.get("user-agent") ?? "");
  if (deduper.firstTime(fingerprint(browser, report.data))) {
    // The report's own `message` would collide with the log line's, so it is logged as `errorMessage`.
    const { message, ...rest } = report.data;
    logger.error("browser error", { ...rest, errorMessage: message });
  }
  return new Response(null, { status: 204 });
}
