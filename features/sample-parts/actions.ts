"use server";

import { actionFor } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { createSamplePart, deleteSamplePart, updateSamplePart } from "@/lib/sample-parts/records";
import { changeSamplePartInput, removeSamplePartInput, samplePartSchema } from "./schema";

/* The writes of the sample parts. Each is the signed-in person's own; the service checks the owner. */

export const addSamplePart = actionFor("member")
  .inputSchema(samplePartSchema)
  .metadata({ name: "addSamplePart" })
  .action(async ({ parsedInput, ctx }) => {
    const row = await createSamplePart(db, ctx.user, parsedInput);
    return { id: row.id };
  });

export const changeSamplePart = actionFor("member")
  .inputSchema(changeSamplePartInput)
  .metadata({ name: "changeSamplePart" })
  .action(async ({ parsedInput, ctx }) => {
    const row = await updateSamplePart(db, ctx.user, {
      id: parsedInput.id,
      seen: new Date(parsedInput.seen),
      input: parsedInput.item,
    });
    return { id: row.id };
  });

export const removeSamplePart = actionFor("member")
  .inputSchema(removeSamplePartInput)
  .metadata({ name: "removeSamplePart" })
  .action(async ({ parsedInput, ctx }) => {
    await deleteSamplePart(db, ctx.user, parsedInput.id);
    return { removed: true };
  });
