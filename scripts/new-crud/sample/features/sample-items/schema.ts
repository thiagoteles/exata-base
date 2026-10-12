import { sampleItemStatuses } from "@/lib/sample-items/options";
import { validationMessage, z } from "@/lib/validation";
import { dateSchema, optional } from "@/lib/validation-br";

/*
 * The form of a sample item, checked in the browser for instant feedback and again on the server.
 * Every field is text while typing; the server receives it clean: an ISO date, an upper-case code,
 * and null for what was left blank.
 */

const MAX_NAME = 120;
const MAX_NOTES = 2000;
const codeShape = /^[A-Za-z0-9-]{1,20}$/;

export const sampleItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: validationMessage("required") })
    .max(MAX_NAME),
  code: optional(z.string().regex(codeShape, { message: validationMessage("invalid") })),
  status: z.enum(sampleItemStatuses, { error: validationMessage("required") }),
  dueDate: optional(dateSchema),
  notes: optional(z.string().max(MAX_NOTES)),
});

export type SampleItemFormInput = z.input<typeof sampleItemSchema>;

/** A new record's form starts blank. */
export const emptySampleItem: SampleItemFormInput = {
  name: "",
  code: "",
  status: "open",
  dueDate: "",
  notes: "",
};

/** A change carries the record and the version the form was opened with. */
export const changeSampleItemInput = z.object({
  id: z.uuid(),
  seen: z.iso.datetime(),
  item: sampleItemSchema,
});

export const removeSampleItemInput = z.object({ id: z.uuid() });
