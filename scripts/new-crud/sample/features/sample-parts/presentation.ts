import type { Route } from "next";
import type { StampTone } from "@/components/ui/stamp";
import { formatDate, type IsoDate } from "@/lib/date";
import type { SamplePartStatus } from "@/lib/sample-parts/options";
import type { SamplePartRow } from "@/lib/sample-parts/records";
import type { SamplePartFormInput } from "./schema";

/*
 * How a sample part is addressed and written. The patterns are real routes; a template string
 * cannot be proved to match one, so each is stated once here.
 */

export const samplePartHref = (id: string) => `/sample-parts/${id}` as Route;
export const editSamplePartHref = (id: string) => `/sample-parts/${id}/edit` as Route;
/** The form of a new record, already under a sample item when it is opened from one. */
export const newSamplePartHref = (sampleItemId?: string) =>
  (sampleItemId === undefined
    ? "/sample-parts/new"
    : `/sample-parts/new?parent=${sampleItemId}`) as Route;
/* The sample item's page belongs to another area; its address is a route, not that area's code. */
export const samplePartParentHref = (sampleItemId: string) =>
  `/sample-items/${sampleItemId}` as Route;

export const samplePartStatusTone: Record<SamplePartStatus, StampTone> = {
  open: "info",
  closed: "neutral",
};

export const showDate = (value: IsoDate | null, locale: string) =>
  value === null ? null : formatDate(value, locale);

/** A stored record as the text its form starts from. */
export const samplePartFormValues = (row: SamplePartRow): SamplePartFormInput => ({
  sampleItemId: row.sampleItemId,
  name: row.name,
  code: row.code ?? "",
  status: row.status,
  dueDate: row.dueDate === null ? "" : formatDate(row.dueDate),
  notes: row.notes ?? "",
});
