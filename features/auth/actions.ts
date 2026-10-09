"use server";

import { publicAction } from "@/lib/actions/client";
import {
  requestPasswordReset,
  resetPassword,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/ports/auth";
import { safeReturnPath } from "@/lib/routes";
import { z } from "@/lib/validation";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

/* The actions behind the local sign-in screens. In Clerk mode the port refuses them with a 400. */

export const signIn = publicAction
  .inputSchema(signInSchema.extend({ next: z.string().optional() }))
  .metadata({ name: "signIn" })
  .action(async ({ parsedInput: { next, ...credentials } }) => {
    await signInWithPassword(credentials);
    return { redirectTo: `/auth/complete?next=${encodeURIComponent(safeReturnPath(next))}` };
  });

export const signUp = publicAction
  .inputSchema(signUpSchema)
  .metadata({ name: "signUp" })
  .action(async ({ parsedInput }) => {
    await signUpWithPassword(parsedInput);
    return { email: parsedInput.email };
  });

/** Answers the same whether or not the account exists, so the form cannot be used to find out. */
export const forgotPassword = publicAction
  .inputSchema(forgotPasswordSchema)
  .metadata({ name: "forgotPassword" })
  .action(async ({ parsedInput }) => {
    await requestPasswordReset(parsedInput);
    return { sent: true };
  });

export const choosePassword = publicAction
  .inputSchema(resetPasswordSchema)
  .metadata({ name: "choosePassword" })
  .action(async ({ parsedInput }) => {
    await resetPassword(parsedInput);
    return { done: true };
  });
