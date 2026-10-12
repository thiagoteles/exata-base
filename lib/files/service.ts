import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { files } from "@/lib/db/schema/files";
import { DomainError } from "@/lib/errors";
import type { FileStorage } from "@/lib/ports/storage/types";

/*
 * Uploads. Every file is private, belongs to one person, and is read back only through a signed
 * URL that expires. The size and type limits come from the environment.
 */

export type UploadLimits = { maxBytes: number; allowedTypes: readonly string[] };

type IncomingFile = { name: string; type: string; bytes: Uint8Array<ArrayBuffer> };

const MAX_NAME_LENGTH = 200;
const BYTES_PER_MB = 1_048_576;
const DOWNLOAD_LINK_SECONDS = 300;
const pathSeparators = /[\\/]+/g;

export const limitsFrom = (maxMb: number, allowedTypes: readonly string[]): UploadLimits => ({
  maxBytes: maxMb * BYTES_PER_MB,
  allowedTypes,
});

/** Throws a 400 domain error naming the reason, so the screen can say exactly what to fix. */
function checkUpload(file: IncomingFile, limits: UploadLimits): void {
  if (file.bytes.byteLength === 0) {
    throw new DomainError(400, "emptyFile");
  }
  if (file.bytes.byteLength > limits.maxBytes) {
    throw new DomainError(400, "fileTooLarge");
  }
  if (!limits.allowedTypes.includes(file.type)) {
    throw new DomainError(400, "fileType");
  }
}

type SaveUpload = {
  db: Database;
  storage: FileStorage;
  ownerId: string;
  file: IncomingFile;
  limits: UploadLimits;
};

export async function saveUpload({
  db,
  storage,
  ownerId,
  file,
  limits,
}: SaveUpload): Promise<{ id: string; name: string }> {
  checkUpload(file, limits);
  const storageKey = `files/${ownerId}/${crypto.randomUUID()}`;
  const name = file.name.replace(pathSeparators, "_").slice(0, MAX_NAME_LENGTH) || "file";

  await storage.put(storageKey, { body: file.bytes, contentType: file.type });
  try {
    const [row] = await db
      .insert(files)
      .values({
        ownerId,
        name,
        contentType: file.type,
        sizeBytes: file.bytes.byteLength,
        storageKey,
      })
      .returning({ id: files.id, name: files.name });
    if (row === undefined) {
      throw new Error("file row was not stored");
    }
    return row;
  } catch (error) {
    // No row means no owner for the bytes: take them back out instead of leaving them orphaned.
    await storage.remove(storageKey).catch(() => undefined);
    throw error;
  }
}

export function listFiles(db: Database, ownerId: string) {
  return db
    .select({
      id: files.id,
      name: files.name,
      contentType: files.contentType,
      sizeBytes: files.sizeBytes,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(eq(files.ownerId, ownerId))
    .orderBy(desc(files.createdAt));
}

/** A short-lived link to a file the person owns. Null for anyone else's file or one that is gone. */
export async function signedDownloadUrl(
  db: Database,
  storage: FileStorage,
  ownerId: string,
  fileId: string,
): Promise<string | null> {
  const [file] = await db
    .select({ name: files.name, storageKey: files.storageKey })
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.ownerId, ownerId)));
  if (file === undefined) {
    return null;
  }
  return storage.signedUrl(file.storageKey, {
    expiresInSeconds: DOWNLOAD_LINK_SECONDS,
    downloadName: file.name,
  });
}
