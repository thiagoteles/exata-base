import { and, asc, count, desc, eq, or } from "drizzle-orm";
import { isRecordId, type Scope, type Viewer, visibleTo } from "@/lib/access/rules";
import type { IsoDate } from "@/lib/date";
import { refusingBrokenLinks, refusingDuplicates, sameVersion } from "@/lib/db/conflicts";
import type { Database } from "@/lib/db/database";
import { sampleItems } from "@/lib/db/schema/sample-items";
import { contains } from "@/lib/db/search";
import { DomainError } from "@/lib/errors";
import { type PageWindow, pageWindow } from "@/lib/list-params";
import type { SampleItemStatus } from "./options";

/*
 * The sample items an account keeps. A person sees and changes only what their account wrote; the
 * team can read everyone's (scope `all`) and change none. Every write checks the owner in the same
 * statement that writes, and a change made over an older version of the record is refused.
 */

export type SampleItemRow = typeof sampleItems.$inferSelect;

export type SampleItemInput = {
  name: string;
  code: string | null;
  status: SampleItemStatus;
  dueDate: IsoDate | null;
  notes: string | null;
};

/** A change to a record, with the `updatedAt` the form was opened with. */
export type Change<Input> = { id: string; seen: Date; input: Input };

const clean = (input: SampleItemInput) => ({ ...input, code: input.code?.toUpperCase() ?? null });

export async function createSampleItem(
  db: Database,
  viewer: Viewer,
  input: SampleItemInput,
): Promise<SampleItemRow> {
  const [row] = await refusingDuplicates("sampleItemCodeTaken", () =>
    db
      .insert(sampleItems)
      .values({ ...clean(input), ownerId: viewer.id })
      .returning(),
  );
  if (row === undefined) {
    throw new Error("sample item was not stored");
  }
  return row;
}

const own = (viewer: Viewer, id: string) =>
  and(eq(sampleItems.id, id), eq(sampleItems.ownerId, viewer.id));

/** Changes a record; 404 when it is not the viewer's, 409 when it changed since the form opened. */
export async function updateSampleItem(
  db: Database,
  viewer: Viewer,
  { id, seen, input }: Change<SampleItemInput>,
): Promise<SampleItemRow> {
  if (!isRecordId(id)) {
    throw new DomainError(404);
  }
  const [row] = await refusingDuplicates("sampleItemCodeTaken", () =>
    db
      .update(sampleItems)
      .set(clean(input))
      .where(and(own(viewer, id), sameVersion(sampleItems.updatedAt, seen)))
      .returning(),
  );
  if (row !== undefined) {
    return row;
  }
  const [current] = await db
    .select({ id: sampleItems.id })
    .from(sampleItems)
    .where(own(viewer, id));
  throw new DomainError(current === undefined ? 404 : 409);
}

/** Deletes a record; 404 when not the viewer's, 409 while records of another area point at it. */
export async function deleteSampleItem(db: Database, viewer: Viewer, id: string): Promise<void> {
  if (!isRecordId(id)) {
    throw new DomainError(404);
  }
  const gone = await refusingBrokenLinks("sampleItemHasLinks", () =>
    db.delete(sampleItems).where(own(viewer, id)).returning({ id: sampleItems.id }),
  );
  if (gone.length === 0) {
    throw new DomainError(404);
  }
}

/** One record, or null when it does not exist or is not the viewer's to see. */
export async function getSampleItem(
  db: Database,
  viewer: Viewer,
  scope: Scope,
  id: string,
): Promise<SampleItemRow | null> {
  const visible = visibleTo(viewer, scope, sampleItems.ownerId);
  if (!isRecordId(id)) {
    return null;
  }
  const [row] = await db
    .select()
    .from(sampleItems)
    .where(and(eq(sampleItems.id, id), visible));
  return row ?? null;
}

export type SampleItemsQuery = {
  q: string;
  status: SampleItemStatus | null;
  sort: "name" | "date";
  dir: "asc" | "desc";
  page: number;
};

export async function querySampleItems(
  db: Database,
  viewer: Viewer,
  scope: Scope,
  { q, status, sort, dir, page }: SampleItemsQuery,
): Promise<{ rows: SampleItemRow[]; window: PageWindow }> {
  const term = q.trim();
  const where = and(
    visibleTo(viewer, scope, sampleItems.ownerId),
    status === null ? undefined : eq(sampleItems.status, status),
    term === ""
      ? undefined
      : or(contains(sampleItems.name, term), contains(sampleItems.code, term)),
  );
  const [{ total = 0 } = {}] = await db.select({ total: count() }).from(sampleItems).where(where);
  const window = pageWindow(page, total);
  if (total === 0) {
    return { rows: [], window };
  }
  const column = { name: sampleItems.name, date: sampleItems.createdAt }[sort];
  const rows = await db
    .select()
    .from(sampleItems)
    .where(where)
    // The id makes the order total, so a page boundary never repeats or skips a row.
    .orderBy(dir === "asc" ? asc(column) : desc(column), desc(sampleItems.id))
    .limit(window.to - window.from + 1)
    .offset(window.offset);
  return { rows, window };
}
