import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/ports/log";

const TIMEOUT_MS = 2000;

/** 200 when the app can reach Postgres, 503 when it cannot. Never cached, never prerendered. */
export async function GET() {
  await connection();
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("database timeout")), TIMEOUT_MS),
      ),
    ]);
    return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logger.error("health check failed", { error });
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
