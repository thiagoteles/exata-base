import process from "node:process";

/*
 * What a Node server does before it answers. A missing or broken variable, or a database it cannot
 * migrate, makes the process exit: the standalone server only logs a failed instrumentation hook
 * and keeps listening, so the exit is explicit.
 */
export async function startServer(): Promise<void> {
  try {
    await import("@/lib/env");
  } catch {
    process.exit(1);
  }
  const [{ prepareDatabase }, { logger }] = await Promise.all([
    import("@/lib/db/startup"),
    import("@/lib/ports/log"),
  ]);
  try {
    await prepareDatabase();
  } catch (error) {
    logger.error("database preparation failed", { error });
    process.exit(1);
  }
}
