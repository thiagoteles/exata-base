import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type DeletionSteps, deleteAccount, hashEmail } from "@/lib/accounts/delete";
import { exportAccount } from "@/lib/accounts/export";
import { accountDeletions } from "@/lib/db/schema/audit";
import { contactMessages } from "@/lib/db/schema/contact";
import { files } from "@/lib/db/schema/files";
import { users } from "@/lib/db/schema/users";
import { createDiskStorage } from "@/lib/ports/storage/adapters/disk";
import type { FileStorage } from "@/lib/ports/storage/types";
import { testDatabase } from "./database";
import { createUser, recordingLogger } from "./factories";

const db = testDatabase();
let directory = "";
let storage: FileStorage;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "lifecycle-"));
  ({ storage } = createDiskStorage({
    directory,
    secret: "s".repeat(32),
    baseUrl: "http://localhost",
    now: Date.now,
  }));
});

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

function steps(
  overrides: Partial<DeletionSteps> = {},
): DeletionSteps & { errors: string[]; providerDeleted: string[] } {
  const errors: string[] = [];
  const providerDeleted: string[] = [];
  return {
    cancelBilling: () => Promise.resolve(),
    storage: () => Promise.resolve(storage),
    deleteProviderUser: (clerkId) => {
      providerDeleted.push(clerkId);
      return Promise.resolve();
    },
    logger: recordingLogger(errors),
    errors,
    providerDeleted,
    ...overrides,
  };
}

async function memberWithData() {
  const member = await createUser(db, "bia@example.com");
  await storage.put("files/bia/recibo.pdf", {
    body: new Uint8Array([7, 8]),
    contentType: "application/pdf",
  });
  await db.insert(files).values({
    ownerId: member.id,
    name: "recibo março.pdf",
    contentType: "application/pdf",
    sizeBytes: 2,
    storageKey: "files/bia/recibo.pdf",
  });
  await db.insert(contactMessages).values({
    userId: member.id,
    name: "Bia",
    email: member.email,
    subject: "support",
    body: "ajuda",
  });
  return member;
}

describe("account export", () => {
  it("is a ZIP with the closed data.json format and the person's files", async () => {
    const member = await memberWithData();
    const zip = unzipSync(
      await exportAccount(db, storage, member.id, new Date("2026-01-02T03:04:05Z")),
    );

    const data = JSON.parse(new TextDecoder().decode(zip["data.json"])) as Record<
      string,
      unknown[]
    >;
    expect(Object.keys(data)).toEqual([
      "version",
      "generated_at",
      "user",
      "plan",
      "payments",
      "contact_messages",
      "files",
    ]);
    expect(data).toMatchObject({ version: 2, generated_at: "2026-01-02T03:04:05.000Z" });
    expect(data["user"]).toHaveLength(1);
    expect(data["plan"]).toHaveLength(1);
    expect(data["contact_messages"]).toHaveLength(1);

    const fileEntries = Object.keys(zip).filter((name) => name.startsWith("files/"));
    expect(fileEntries).toHaveLength(1);
    expect(fileEntries[0]?.endsWith("recibo_mar_o.pdf")).toBe(true);
    expect([...(zip[fileEntries[0] ?? ""] ?? [])]).toEqual([7, 8]);
  });

  it("contains nothing of another person", async () => {
    await memberWithData();
    const other = await createUser(db, "caio@example.com");
    const zip = unzipSync(await exportAccount(db, storage, other.id, new Date()));
    const data = JSON.parse(new TextDecoder().decode(zip["data.json"])) as Record<
      string,
      unknown[]
    >;
    expect(data["contact_messages"]).toEqual([]);
    expect(Object.keys(zip)).toEqual(["data.json"]);
  });
});

describe("account deletion", () => {
  it("removes the row, the owned rows and the stored files, and leaves a trail without the e-mail", async () => {
    const member = await memberWithData();
    const run = steps();
    expect(await deleteAccount(db, run, { userId: member.id, requestedBy: "self" })).toBe(true);

    expect(await db.select().from(users)).toEqual([]);
    expect(await db.select().from(files)).toEqual([]);
    expect(await storage.get("files/bia/recibo.pdf")).toBeNull();
    const [trail] = await db.select().from(accountDeletions);
    expect(trail).toMatchObject({
      formerUserId: member.id,
      emailHash: hashEmail("bia@example.com"),
      requestedBy: "self",
    });
    expect(JSON.stringify(trail)).not.toContain("bia@example.com");
  });

  it("deletes nothing when canceling the subscription fails", async () => {
    const member = await memberWithData();
    const run = steps({ cancelBilling: () => Promise.reject(new Error("stripe down")) });
    await expect(
      deleteAccount(db, run, { userId: member.id, requestedBy: "self" }),
    ).rejects.toThrow("stripe down");
    expect(await db.select().from(users)).toHaveLength(1);
    expect(await storage.get("files/bia/recibo.pdf")).not.toBeNull();
  });

  it("refuses to delete the last admin", async () => {
    const admin = await createUser(db, "admin@example.com", "admin");
    await expect(
      deleteAccount(db, steps(), { userId: admin.id, requestedBy: "self" }),
    ).rejects.toMatchObject({
      status: 409,
    });
    expect(await db.select().from(accountDeletions)).toEqual([]);
  });

  it("deletes the Clerk user last, and only logs when Clerk fails", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "c@example.com", clerkId: "user_9" })
      .returning();
    const run = steps({ deleteProviderUser: () => Promise.reject(new Error("clerk down")) });
    expect(
      await deleteAccount(db, run, {
        userId: user?.id ?? "",
        requestedBy: "admin",
        requestedByEmail: "a@x.com",
      }),
    ).toBe(true);
    expect(await db.select().from(users)).toEqual([]);
    expect(run.errors).toEqual(["auth provider user not deleted"]);
  });

  it("does nothing for an account that no longer exists", async () => {
    const run = steps();
    expect(await deleteAccount(db, run, { userId: crypto.randomUUID(), requestedBy: "self" })).toBe(
      false,
    );
    expect(await db.select().from(accountDeletions)).toEqual([]);
  });
});
