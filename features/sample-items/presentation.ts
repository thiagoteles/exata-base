import type { Route } from "next";
import type { StampTone } from "@/components/ui/stamp";
import { formatDate, type IsoDate } from "@/lib/date";
import type { SampleItemStatus } from "@/lib/sample-items/options";
import type { SampleItemRow } from "@/lib/sample-items/records";
import type { SampleItemFormInput } from "./schema";

/*
 * How a sample item is addressed and written. The patterns are real routes; a template string
 * cannot be proved to match one, so each is stated once here.
 */

export const sampleItemHref = (id: string) => `/sample-items/${id}` as Route;
export const editSampleItemHref = (id: string) => `/sample-items/${id}/edit` as Route;

export const sampleItemStatusTone: Record<SampleItemStatus, StampTone> = {
  open: "info",
  closed: "neutral",
};

export const showDate = (value: IsoDate | null, locale: string) =>
  value === null ? null : formatDate(value, locale);

/** A stored record as the text its form starts from. */
export const sampleItemFormValues = (row: SampleItemRow): SampleItemFormInput => ({
  name: row.name,
  code: row.code ?? "",
  status: row.status,
  dueDate: row.dueDate === null ? "" : formatDate(row.dueDate),
  notes: row.notes ?? "",
});
