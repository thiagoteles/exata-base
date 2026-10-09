import { apiScopes } from "@/domain/api/tokens";
import { validationMessage, z } from "@/lib/validation";

const MAX_NAME = 60;
const required = { message: validationMessage("required") };

export const createTokenSchema = z.object({
  name: z.string().trim().min(1, required).max(MAX_NAME),
  scopes: z
    .array(z.enum(apiScopes))
    .min(1, { message: validationMessage("tooFew", { minimum: 1 }) }),
  expiresInDays: z.union([z.literal(30), z.literal(90), z.literal(365)]).nullable(),
});

export const revokeTokenSchema = z.object({ id: z.uuid() });
