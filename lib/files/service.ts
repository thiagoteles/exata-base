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

/** The record a file is attached to: the kind of record and its id. */
export type FileSubject = { type: string; id: string };

type IncomingFile = { name: string; type: string; bytes: Uint8Array<ArrayBuffer> };

const MAX_NAME_LENGTH = 200;
const BYTES_PER_MB = 1_048_576;
const DOWNLOAD_LINK_SECONDS = 300;
const pathSeparators = /[\\/]+/g;
const LABEL_SHAPE = /^[a-z][a-z0-9_]{0,31}$/;

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
  /** The record the file belongs to. The caller has already checked that the owner owns it. */
  subject?: FileSubject;
  /** What the file is for that record, such as `statement`. */
  kind?: string;
};

function checkLabels(subject: FileSubject | undefined, kind: string | undefined): void {
  const labels = [subject?.type, kind].filter((label) => label !== undefined);
  if (labels.some((label) => !LABEL_SHAPE.test(label))) {
    throw new RangeError("A file's record type and kind are lowercase words with underscores");
  }
}

export async function saveUpload({
  db,
  storage,
  ownerId,
  file,
  limits,
  subject,
  kind,
}: SaveUpload): Promise<{ id: string; name: string }> {
  checkLabels(subject, kind);
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
        subjectType: subject?.type ?? null,
        subjectId: subject?.id ?? null,
        kind: kind ?? null,
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

/** The person's files, newest first; with a subject, only the files attached to that record. */
export function listFiles(db: Database, ownerId: string, subject?: FileSubject) {
  return db
    .select({
      id: files.id,
      name: files.name,
      contentType: files.contentType,
      sizeBytes: files.sizeBytes,
      kind: files.kind,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(
      subject === undefined
        ? eq(files.ownerId, ownerId)
        : and(
            eq(files.ownerId, ownerId),
            eq(files.subjectType, subject.type),
            eq(files.subjectId, subject.id),
          ),
    )
    .orderBy(desc(files.createdAt));
}

/** Removes the bytes and the rows of every file attached to a record, for when the record goes. */
export async function removeFilesOf(
  db: Database,
  storage: FileStorage,
  ownerId: string,
  subject: FileSubject,
): Promise<number> {
  const rows = await db
    .select({ id: files.id, storageKey: files.storageKey })
    .from(files)
    .where(
      and(
        eq(files.ownerId, ownerId),
        eq(files.subjectType, subject.type),
        eq(files.subjectId, subject.id),
      ),
    );
  for (const row of rows) {
    // biome-ignore lint/performance/noAwaitInLoops: one object at a time keeps a failure attributable
    await storage.remove(row.storageKey);
    await db.delete(files).where(eq(files.id, row.id));
  }
  return rows.length;
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
