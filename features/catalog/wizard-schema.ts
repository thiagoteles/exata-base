import { z } from "@/lib/validation";
import { cepSchema, cpfSchema, dateSchema, moneySchema } from "@/lib/validation-br";

/*
 * The three steps of the wizard. The browser checks each step with these schemas for instant
 * feedback, and the server checks the same schemas again in the real action: one definition,
 * two places.
 */

const MIN_NAME = 3;
const STATE_LENGTH = 2;

export const dataStep = z.object({
  name: z.string().trim().min(MIN_NAME),
  cpf: cpfSchema,
  birth: dateSchema,
});

export const addressStep = z.object({
  cep: cepSchema,
  street: z.string().trim().min(1),
  number: z.string().trim().min(1),
  district: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().length(STATE_LENGTH),
});

export const valueStep = z.object({ amount: moneySchema });

export const wizardSchema = z.object({
  ...dataStep.shape,
  ...addressStep.shape,
  ...valueStep.shape,
});

export const stepSchemas = { data: dataStep, address: addressStep, value: valueStep } as const;
export type StepName = keyof typeof stepSchemas;
export const stepNames = ["data", "address", "value"] as const satisfies readonly StepName[];

/** What the form holds while typing: every field is text. */
export type WizardInput = z.input<typeof wizardSchema>;
/** What the server understands: digits, an ISO date, integer cents. */
export type WizardOutput = z.output<typeof wizardSchema>;
