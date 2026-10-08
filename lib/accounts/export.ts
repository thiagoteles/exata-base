import { eq } from "drizzle-orm";
import { zipSync } from "fflate";
import type { Database } from "@/lib/db/database";
import { exportedData } from "@/lib/db/personal-data";
import { files } from "@/lib/db/schema/files";
import type { FileStorage } from "@/lib/ports/storage/types";

/*
 * The account export: a ZIP with `data.json` and a `files/` folder. The format is closed:
 * `data.json` holds `version`, `generated_at` and one key per exported table, always an array.
 * Tables join the export through the personal data registry, never here.
 */

const EXPORT_VERSION = 1;

const encoder = new TextEncoder();
const unsafeNameCharacters = /[^\w.-]+/g;

export async function exportAccount(
  db: Database,
  storage: FileStorage,
  userId: string,
  now: Date = new Date(),
): Promise<Uint8Array> {
  const tables = await Promise.all(
    exportedData.map(
      async ({ key, table, owner }) =>
        [key, await db.select().from(table).where(eq(owner, userId))] as const,
    ),
  );
  const data = {
    version: EXPORT_VERSION,
    generated_at: now.toISOString(),
    ...Object.fromEntries(tables),
  };

  const entries: Record<string, Uint8Array> = {
    "data.json": encoder.encode(JSON.stringify(data, null, 2)),
  };
  const owned = await db.select().from(files).where(eq(files.ownerId, userId));
  const stored = await Promise.all(owned.map((file) => storage.get(file.storageKey)));
  owned.forEach((file, index) => {
    const content = stored[index];
    if (content !== null && content !== undefined) {
      entries[`files/${file.id}-${file.name.replace(unsafeNameCharacters, "_")}`] = content.body;
    }
  });
  return zipSync(entries);
}
