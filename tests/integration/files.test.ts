import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { files } from "@/lib/db/schema/files";
import { limitsFrom, listFiles, saveUpload, signedDownloadUrl } from "@/lib/files/service";
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
});
