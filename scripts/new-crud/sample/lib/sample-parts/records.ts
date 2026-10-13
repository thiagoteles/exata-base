import { and, asc, count, desc, eq, or } from "drizzle-orm";
import { isRecordId, type Scope, type Viewer, visibleTo } from "@/lib/access/rules";
import type { IsoDate } from "@/lib/date";
import { refusingBrokenLinks, refusingDuplicates, sameVersion } from "@/lib/db/conflicts";
import type { Database } from "@/lib/db/database";
import { sampleItems } from "@/lib/db/schema/sample-items";
import { sampleParts } from "@/lib/db/schema/sample-parts";
import { contains } from "@/lib/db/search";
import { DomainError } from "@/lib/errors";
import { type PageWindow, pageWindow } from "@/lib/list-params";
import type { SamplePartStatus } from "./options";

/*
 * The sample parts an account keeps, each filed under one of the account's sample items. A person
 * sees and changes only what their account wrote; the team can read everyone's (scope `all`) and
 * change none. Every write checks the owner in the same statement that writes, the database
 * refuses a sample item of another account, and a change made over an older version of the record
 * is refused.
 */

export type SamplePartRow = typeof sampleParts.$inferSelect;

/** A record as it is read: the row and the name of the sample item it is filed under. */
export type SamplePartView = SamplePartRow & { parentName: string };

export type SamplePartInput = {
  sampleItemId: string;
  name: string;
  code: string | null;
  status: SamplePartStatus;
  dueDate: IsoDate | null;
  notes: string | null;
};

/** A change to a record, with the `updatedAt` the form was opened with. */
export type Change<Input> = { id: string; seen: Date; input: Input };

const clean = (input: SamplePartInput) => ({ ...input, code: input.code?.toUpperCase() ?? null });

/** A write refused as a duplicate code, or as a sample item that is not the account's. */
const refusing = <T>(write: () => Promise<T>) =>
  refusingDuplicates("samplePartCodeTaken", () =>
    refusingBrokenLinks("samplePartParentMissing", write),
  );

/** A parent id that is not an id names nothing; it is refused like one of another account. */
function checkParent(input: SamplePartInput) {
  if (!isRecordId(input.sampleItemId)) {
    throw new DomainError(409, "samplePartParentMissing");
  }
}

export async function createSamplePart(
  db: Database,
  viewer: Viewer,
  input: SamplePartInput,
): Promise<SamplePartRow> {
  checkParent(input);
  const [row] = await refusing(() =>
    db
      .insert(sampleParts)
      .values({ ...clean(input), ownerId: viewer.id })
      .returning(),
  );
  if (row === undefined) {
    throw new Error("sample part was not stored");
  }
  return row;
}

const own = (viewer: Viewer, id: string) =>
  and(eq(sampleParts.id, id), eq(sampleParts.ownerId, viewer.id));

/** Changes a record; 404 when it is not the viewer's, 409 when it changed since the form opened. */
export async function updateSamplePart(
  db: Database,
  viewer: Viewer,
  { id, seen, input }: Change<SamplePartInput>,
): Promise<SamplePartRow> {
  if (!isRecordId(id)) {
    throw new DomainError(404);
  }
  checkParent(input);
  const [row] = await refusing(() =>
    db
      .update(sampleParts)
      .set(clean(input))
      .where(and(own(viewer, id), sameVersion(sampleParts.updatedAt, seen)))
      .returning(),
  );
  if (row !== undefined) {
    return row;
  }
  const [current] = await db
    .select({ id: sampleParts.id })
    .from(sampleParts)
    .where(own(viewer, id));
  throw new DomainError(current === undefined ? 404 : 409);
}

/** Deletes a record; 404 when not the viewer's, 409 while records of another area point at it. */
export async function deleteSamplePart(db: Database, viewer: Viewer, id: string): Promise<void> {
  if (!isRecordId(id)) {
    throw new DomainError(404);
  }
  const gone = await refusingBrokenLinks("samplePartHasLinks", () =>
    db.delete(sampleParts).where(own(viewer, id)).returning({ id: sampleParts.id }),
  );
  if (gone.length === 0) {
    throw new DomainError(404);
  }
}

const viewColumns = { row: sampleParts, parentName: sampleItems.name };
const asView = ({ row, parentName }: { row: SamplePartRow; parentName: string }) => ({
  ...row,
  parentName,
});

/** One record, or null when it does not exist or is not the viewer's to see. */
export async function getSamplePart(
  db: Database,
  viewer: Viewer,
  scope: Scope,
  id: string,
): Promise<SamplePartView | null> {
  const visible = visibleTo(viewer, scope, sampleParts.ownerId);
  if (!isRecordId(id)) {
    return null;
  }
  const [found] = await db
    .select(viewColumns)
    .from(sampleParts)
    .innerJoin(sampleItems, eq(sampleItems.id, sampleParts.sampleItemId))
    .where(and(eq(sampleParts.id, id), visible));
  return found === undefined ? null : asView(found);
}

/** The records filed under one sample item, by name; empty when it is not the viewer's to see. */
export async function samplePartsOfSampleItem(
  db: Database,
  viewer: Viewer,
  scope: Scope,
  sampleItemId: string,
): Promise<SamplePartRow[]> {
  const visible = visibleTo(viewer, scope, sampleParts.ownerId);
  if (!isRecordId(sampleItemId)) {
    return [];
  }
  return await db
    .select()
    .from(sampleParts)
    .where(and(eq(sampleParts.sampleItemId, sampleItemId), visible))
    .orderBy(asc(sampleParts.name), desc(sampleParts.id));
}

/** The account's sample items by name: what a record can be filed under, as a form's choices. */
export async function samplePartParents(
  db: Database,
  viewer: Viewer,
): Promise<{ id: string; name: string }[]> {
  return await db
    .select({ id: sampleItems.id, name: sampleItems.name })
    .from(sampleItems)
    .where(eq(sampleItems.ownerId, viewer.id))
    .orderBy(asc(sampleItems.name), desc(sampleItems.id));
}

export type SamplePartsQuery = {
  q: string;
  status: SamplePartStatus | null;
  sort: "name" | "date";
  dir: "asc" | "desc";
  page: number;
};

export async function querySampleParts(
  db: Database,
  viewer: Viewer,
  scope: Scope,
  { q, status, sort, dir, page }: SamplePartsQuery,
): Promise<{ rows: SamplePartView[]; window: PageWindow }> {
  const term = q.trim();
  const where = and(
    visibleTo(viewer, scope, sampleParts.ownerId),
    status === null ? undefined : eq(sampleParts.status, status),
    term === ""
      ? undefined
      : or(
          contains(sampleParts.name, term),
          contains(sampleParts.code, term),
          contains(sampleItems.name, term),
        ),
  );
  const [{ total = 0 } = {}] = await db
    .select({ total: count() })
    .from(sampleParts)
    .innerJoin(sampleItems, eq(sampleItems.id, sampleParts.sampleItemId))
    .where(where);
  const window = pageWindow(page, total);
  if (total === 0) {
    return { rows: [], window };
  }
  const column = { name: sampleParts.name, date: sampleParts.createdAt }[sort];
  const rows = await db
    .select(viewColumns)
    .from(sampleParts)
    .innerJoin(sampleItems, eq(sampleItems.id, sampleParts.sampleItemId))
    .where(where)
    // The id makes the order total, so a page boundary never repeats or skips a row.
    .orderBy(dir === "asc" ? asc(column) : desc(column), desc(sampleParts.id))
    .limit(window.to - window.from + 1)
    .offset(window.offset);
  return { rows: rows.map(asView), window };
}
