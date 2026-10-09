import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { DeletionSteps } from "@/lib/accounts/delete";
import { reapplyDeletions } from "@/lib/accounts/reapply-deletions";
import { accountDeletions } from "@/lib/db/schema/audit";
import { users } from "@/lib/db/schema/users";
import type { FileStorage } from "@/lib/ports/storage/types";
import { testDatabase } from "./database";
import { createUser, recordingLogger } from "./factories";

const db = testDatabase();

const steps = (logger = recordingLogger()): DeletionSteps => ({
  cancelBilling: () => Promise.resolve(),
  storage: () => Promise.resolve({ remove: () => Promise.resolve() } as unknown as FileStorage),
  deleteProviderUser: () => Promise.resolve(),
  logger,
});

describe("reapplying deletions after a restore", () => {
  it("deletes the restored accounts again, once each, and skips the ones not there", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    const result = await reapplyDeletions(db, steps(), [
      ana.id,
      ana.id,
      "00000000-0000-4000-8000-000000000000",
    ]);
    expect(result).toEqual({ deleted: 1, absent: 1 });
    expect(await db.select().from(users).where(eq(users.id, ana.id))).toEqual([]);
    expect(await db.select().from(users).where(eq(users.id, bia.id))).toHaveLength(1);
    expect(await db.select().from(accountDeletions)).toMatchObject([
      { formerUserId: ana.id, requestedBy: "admin", requestedByEmail: "restore" },
    ]);
  });

  it("writes every deletion to the log, where it survives a lost database", async () => {
    const ana = await createUser(db, "ana@example.com");
    const lines: { message: string; fields: unknown }[] = [];
    const logger = recordingLogger();
    logger.info = (message, fields) => {
      lines.push({ message, fields });
    };
    await reapplyDeletions(db, steps(logger), [ana.id]);
    expect(lines).toContainEqual({
      message: "account deleted",
      fields: { formerUserId: ana.id, requestedBy: "admin" },
    });
  });
});
