"use server";

import { actionFor } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { createSampleItem, deleteSampleItem, updateSampleItem } from "@/lib/sample-items/records";
import { changeSampleItemInput, removeSampleItemInput, sampleItemSchema } from "./schema";

/* The writes of the sample items. Each is the signed-in person's own; the service checks the owner. */

export const addSampleItem = actionFor("member")
  .inputSchema(sampleItemSchema)
  .metadata({ name: "addSampleItem" })
  .action(async ({ parsedInput, ctx }) => {
    const row = await createSampleItem(db, ctx.user, parsedInput);
    return { id: row.id };
  });

export const changeSampleItem = actionFor("member")
  .inputSchema(changeSampleItemInput)
  .metadata({ name: "changeSampleItem" })
  .action(async ({ parsedInput, ctx }) => {
    const row = await updateSampleItem(db, ctx.user, {
      id: parsedInput.id,
      seen: new Date(parsedInput.seen),
      input: parsedInput.item,
    });
    return { id: row.id };
  });

export const removeSampleItem = actionFor("member")
  .inputSchema(removeSampleItemInput)
  .metadata({ name: "removeSampleItem" })
  .action(async ({ parsedInput, ctx }) => {
    await deleteSampleItem(db, ctx.user, parsedInput.id);
    return { removed: true };
  });
