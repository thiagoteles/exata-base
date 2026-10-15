import type { ScheduledOperation } from "./run";

/*
 * The product's own scheduled operations, run beside the base's under the cadence each declares.
 * The product owns this file. A cadence that gets its first operation also needs its line in the
 * host's cron and in `ops/gcp/heartbeats.json`, which a test checks.
 */
export const productOperations: readonly ScheduledOperation[] = [];
