import { isValidCep, isValidCpf, isValidPhone } from "@brazilian-utils/brazilian-utils";
import { parseDate } from "@/lib/date";
import { digitsOf } from "@/lib/masks";
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
