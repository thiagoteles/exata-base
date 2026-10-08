import { validationMessage, z } from "@/lib/validation";

/* Shared by the forms in the browser and the actions on the server. */

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const MIN_NAME = 2;

const required = { message: validationMessage("required") };

const email = z.string().trim().min(1, required).pipe(z.email());
const newPassword = z.string().min(MIN_PASSWORD).max(MAX_PASSWORD);

export const signInSchema = z.object({ email, password: z.string().min(1, required) });
export const signUpSchema = z.object({
  name: z.string().trim().min(MIN_NAME),
  email,
  password: newPassword,
});
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(1), password: newPassword });
