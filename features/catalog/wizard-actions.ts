"use server";

import { actionFor } from "@/lib/actions/client";
import { lookupCep } from "@/lib/ports/cep";
import { z } from "@/lib/validation";
import { addressStep, dataStep, valueStep, wizardSchema } from "./wizard-schema";

/*
 * The real actions behind the wizard. Each step is validated here with the same schema the form
 * used; the last call checks everything together and stores nothing.
 */

export const validateData = actionFor("staff")
  .inputSchema(dataStep)
  .metadata({ name: "validateData" })
  .action(() => Promise.resolve({ ok: true }));

export const validateAddress = actionFor("staff")
  .inputSchema(addressStep)
  .metadata({ name: "validateAddress" })
  .action(() => Promise.resolve({ ok: true }));

export const validateValue = actionFor("staff")
  .inputSchema(valueStep)
  .metadata({ name: "validateValue" })
  .action(() => Promise.resolve({ ok: true }));

/** Checks every step together and returns what would be saved. Nothing is stored. */
export const confirmWizard = actionFor("staff")
  .inputSchema(wizardSchema)
  .metadata({ name: "confirmWizard" })
  .action(({ parsedInput }) => Promise.resolve({ checked: parsedInput }));

export const findAddress = actionFor("staff")
  .inputSchema(z.object({ cep: z.string().min(1) }))
  .metadata({ name: "findAddress" })
  .action(({ parsedInput }) => lookupCep(parsedInput.cep));
