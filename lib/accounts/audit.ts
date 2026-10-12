import type { Executor } from "@/lib/db/database";
import { staffAuditLog } from "@/lib/db/schema/audit";
import type { Actor } from "./actor";

type StaffWrite = {
  action: string;
  targetTable: string;
  targetId?: string;
  details?: Record<string, unknown>;
};

/** Records a write made by staff or an admin. Call it inside the same transaction as the write. */
export async function recordStaffWrite(
  executor: Executor,
  actor: Actor,
  write: StaffWrite,
): Promise<void> {
  await executor.insert(staffAuditLog).values({
    actorId: actor.id,
    actorEmail: actor.email,
    action: write.action,
    targetTable: write.targetTable,
    targetId: write.targetId ?? null,
    details: write.details ?? {},
  });
}
