import {
  isValidCep,
  isValidCnpj,
  isValidCpf,
  isValidPhone,
} from "@brazilian-utils/brazilian-utils";
import { parseDate } from "@/lib/date";
import { alphanumericOf, digitsOf } from "@/lib/masks";
import { parseBRL } from "@/lib/money";
import { validationMessage, z } from "@/lib/validation";

/*
 * Zod schemas for Brazilian data. They accept what the masks produce, check that the value is
 * real (not just well shaped), and output the clean form: digits for CPF, phone and CEP, an ISO
 * date, integer cents. The messages are catalog keys.
 */

const invalid = (key: "invalid" | "invalidDate" | "invalidMoney") => ({
  message: validationMessage(key),
});

export const cpfSchema = z
  .string()
  .transform(digitsOf)
  .refine((digits) => isValidCpf(digits), invalid("invalid"));

/** A CNPJ, numeric or alphanumeric (version 2 reads both), returned as fourteen capitals and digits. */
export const cnpjSchema = z
  .string()
  .transform(alphanumericOf)
  .refine((value) => isValidCnpj(value, { version: 2 }), invalid("invalid"));

export const phoneSchema = z
  .string()
  .transform(digitsOf)
  .refine((digits) => isValidPhone(digits), invalid("invalid"));

export const cepSchema = z
  .string()
  .transform(digitsOf)
  .refine((digits) => isValidCep(digits), invalid("invalid"));

export const dateSchema = z.string().transform((value, context) => {
  const date = parseDate(value);
  if (date === null) {
    context.addIssue({ code: "custom", message: validationMessage("invalidDate") });
    return z.NEVER;
  }
  return date;
});

export const moneySchema = z.string().transform((value, context) => {
  const cents = parseBRL(value);
  if (cents === null || cents <= 0) {
    context.addIssue({ code: "custom", message: validationMessage("invalidMoney") });
    return z.NEVER;
  }
  return cents;
});

/**
 * A field that may stay empty: blank (or only spaces) becomes null, and anything typed must pass
 * the schema. `optional(cpfSchema)` is an optional CPF that still has to be a real one.
 */
export function optional<Output>(schema: z.ZodType<Output, string>) {
  return z
    .string()
    .trim()
    .pipe(z.union([z.literal("").transform(() => null), schema]));
}
