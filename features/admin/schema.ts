import { userRole } from "@/lib/db/schema/users";
import { validationMessage, z } from "@/lib/validation";

const MAX_REASON = 200;
const required = { message: validationMessage("required") };

const roles = z.enum(userRole.enumValues);

export const roleChangeSchema = z.object({ id: z.uuid(), role: roles });
export const courtesySchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(1, required).max(MAX_REASON),
});
export const userIdSchema = z.object({ id: z.uuid() });
export const inviteSchema = z.object({
  email: z.string().trim().min(1, required).pipe(z.email()),
  role: roles,
});
