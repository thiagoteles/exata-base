import { describe, expect, it } from "vitest";
import { processClerkEvent } from "@/lib/accounts/clerk-webhook";
import type { DeletionSteps } from "@/lib/accounts/delete";
import { accountDeletions } from "@/lib/db/schema/audit";
import { clerkEvents } from "@/lib/db/schema/auth";
import { users } from "@/lib/db/schema/users";
import type { FileStorage } from "@/lib/ports/storage/types";
import { testDatabase } from "./database";
import { recordingLogger } from "./factories";

const db = testDatabase();

const noStorage: FileStorage = {
  put: () => Promise.resolve(),
  get: () => Promise.resolve(null),
  remove: () => Promise.resolve(),
  signedUrl: () => Promise.resolve(""),
};
const deletion: DeletionSteps = {
  cancelBilling: () => Promise.resolve(),
  storage: () => Promise.resolve(noStorage),
  deleteProviderUser: () => Promise.reject(new Error("must not be called")),
  logger: recordingLogger(),
};
const deps = { adminEmails: [], deletion };
const profile = { clerkId: "user_1", email: "ana@example.com", name: "Ana", image: null };

describe("Clerk webhook", () => {
  it("processes a delivery once, and acknowledges a replay without writing", async () => {
    const created = { type: "user.created" as const, id: "msg_1", profile };
    expect(await processClerkEvent(db, created, deps)).toBe("processed");
    await db.delete(users);
    expect(await processClerkEvent(db, created, deps)).toBe("duplicate");
    expect(await db.select().from(users)).toEqual([]);
    expect(await db.select().from(clerkEvents)).toHaveLength(1);
  });

  it("deletes the account on user.deleted, and a late delivery finds nothing to do", async () => {
    await processClerkEvent(db, { type: "user.created", id: "msg_1", profile }, deps);
    await processClerkEvent(db, { type: "user.deleted", id: "msg_2", clerkId: "user_1" }, deps);
    expect(await db.select().from(users)).toEqual([]);
    expect(await db.select().from(accountDeletions)).toHaveLength(1);

    expect(
      await processClerkEvent(db, { type: "user.deleted", id: "msg_3", clerkId: "user_1" }, deps),
    ).toBe("processed");
    expect(await db.select().from(accountDeletions)).toHaveLength(1);
  });
});
