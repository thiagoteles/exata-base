import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { files } from "@/lib/db/schema/files";
import {
  limitsFrom,
  listFiles,
  removeFilesOf,
  saveUpload,
  signedDownloadUrl,
} from "@/lib/files/service";
import { createDiskStorage } from "@/lib/ports/storage/adapters/disk";
import type { FileStorage } from "@/lib/ports/storage/types";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const limits = limitsFrom(1, ["image/png", "application/pdf"]);
let directory = "";
let storage: FileStorage;
let readSigned: ReturnType<typeof createDiskStorage>["readSigned"];

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "uploads-"));
  ({ storage, readSigned } = createDiskStorage({
    directory,
    secret: "s".repeat(32),
    baseUrl: "http://localhost",
    now: Date.now,
  }));
});

const pdf = (bytes = 10) => ({
  name: "recibo.pdf",
  type: "application/pdf",
  bytes: new Uint8Array(new ArrayBuffer(bytes)).fill(7),
});

describe("uploads", () => {
  it("stores the bytes, the row and a link that opens only the owner's file", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    const { id } = await saveUpload({ db, storage, ownerId: ana.id, file: pdf(), limits });

    const url = new URL((await signedDownloadUrl(db, storage, ana.id, id)) ?? "");
    const key = decodeURIComponent(url.pathname.replace("/storage/", ""));
    expect(await readSigned(key, url.searchParams)).toMatchObject({
      contentType: "application/pdf",
      downloadName: "recibo.pdf",
    });
    expect(await signedDownloadUrl(db, storage, bia.id, id)).toBeNull();
    expect(await listFiles(db, bia.id)).toEqual([]);
    expect((await listFiles(db, ana.id)).map((file) => file.name)).toEqual(["recibo.pdf"]);
  });

  it("refuses a file that is too big, the wrong type or empty, and stores nothing", async () => {
    const ana = await createUser(db, "ana@example.com");
    const before = (await readdir(directory, { recursive: true })).length;
    await expect(
      saveUpload({ db, storage, ownerId: ana.id, file: pdf(2_000_000), limits }),
    ).rejects.toMatchObject({
      status: 400,
      key: "fileTooLarge",
    });
    await expect(
      saveUpload({ db, storage, ownerId: ana.id, file: { ...pdf(), type: "text/html" }, limits }),
    ).rejects.toMatchObject({ key: "fileType" });
    await expect(
      saveUpload({ db, storage, ownerId: ana.id, file: pdf(0), limits }),
    ).rejects.toMatchObject({
      key: "emptyFile",
    });
    expect(await db.select().from(files)).toEqual([]);
    expect((await readdir(directory, { recursive: true })).length).toBe(before);
  });

  it("keeps a path out of the stored name", async () => {
    const ana = await createUser(db, "ana@example.com");
    const { id } = await saveUpload({
      db,
      storage,
      ownerId: ana.id,
      file: { ...pdf(), name: "../../etc/passwd" },
      limits,
    });
    const [row] = await db.select().from(files).where(eq(files.id, id));
    expect(row?.name).toBe(".._.._etc_passwd");
    expect(row?.name).not.toContain("/");
  });

  it("attaches a file to a record, with what it is for, and lists only that record's files", async () => {
    const ana = await createUser(db, "ana@example.com");
    const invoice = { type: "invoice", id: crypto.randomUUID() };
    const other = { type: "invoice", id: crypto.randomUUID() };
    await saveUpload({
      db,
      storage,
      ownerId: ana.id,
      file: pdf(),
      limits,
      subject: invoice,
      kind: "statement",
    });
    await saveUpload({ db, storage, ownerId: ana.id, file: pdf(), limits, subject: other });
    await saveUpload({ db, storage, ownerId: ana.id, file: pdf(), limits });
    expect(await listFiles(db, ana.id)).toHaveLength(3);
    const attached = await listFiles(db, ana.id, invoice);
    expect(attached).toHaveLength(1);
    expect(attached[0]?.kind).toBe("statement");
  });

  it("does not show a record's files to another person, even with the record's id", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    const subject = { type: "invoice", id: crypto.randomUUID() };
    await saveUpload({ db, storage, ownerId: ana.id, file: pdf(), limits, subject });
    expect(await listFiles(db, bia.id, subject)).toEqual([]);
  });

  it("refuses a record type or kind that is not a lowercase word", async () => {
    const ana = await createUser(db, "ana@example.com");
    const subject = { type: "Invoice", id: crypto.randomUUID() };
    await expect(
      saveUpload({ db, storage, ownerId: ana.id, file: pdf(), limits, subject }),
    ).rejects.toThrow(RangeError);
    await expect(
      saveUpload({
        db,
        storage,
        ownerId: ana.id,
        file: pdf(),
        limits,
        kind: "bad kind",
      }),
    ).rejects.toThrow(RangeError);
    expect(await db.select().from(files)).toEqual([]);
  });

  it("holds a file to a smaller limit when the caller passes one", async () => {
    const ana = await createUser(db, "ana@example.com");
    const small = limitsFrom(1, ["application/pdf"]);
    await expect(
      saveUpload({
        db,
        storage,
        ownerId: ana.id,
        file: pdf(1_048_577),
        limits: small,
      }),
    ).rejects.toMatchObject({ key: "fileTooLarge" });
    await expect(
      saveUpload({
        db,
        storage,
        ownerId: ana.id,
        file: pdf(1_048_576),
        limits: small,
      }),
    ).resolves.toMatchObject({ name: "recibo.pdf" });
  });

  it("removes the files of a record, the bytes with the rows, and only that record's", async () => {
    const ana = await createUser(db, "ana@example.com");
    const gone = { type: "invoice", id: crypto.randomUUID() };
    const kept = { type: "invoice", id: crypto.randomUUID() };
    await saveUpload({ db, storage, ownerId: ana.id, file: pdf(), limits, subject: gone });
    await saveUpload({ db, storage, ownerId: ana.id, file: pdf(), limits, subject: gone });
    await saveUpload({ db, storage, ownerId: ana.id, file: pdf(), limits, subject: kept });
    const before = (await readdir(directory, { recursive: true })).length;
    expect(await removeFilesOf(db, storage, ana.id, gone)).toBe(2);
    expect(await listFiles(db, ana.id, gone)).toEqual([]);
    expect(await listFiles(db, ana.id, kept)).toHaveLength(1);
    expect((await readdir(directory, { recursive: true })).length).toBeLessThan(before);
  });
});
