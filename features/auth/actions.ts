"use server";

import { cookies } from "next/headers";
import { currentInstant } from "@/domain/clock";
import { publicAction } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import {
  requestPasswordReset,
  resetPassword,
  signInWithPassword,
  signUpWithPassword,
  verifySecondFactor,
} from "@/lib/ports/auth";
import { logger } from "@/lib/ports/log";
import {
  passwordResetAttempts,
  secondFactorAttempts,
  signInAttempts,
} from "@/lib/rate-limit/credential-rules";
import { enforceCredentialAttempt } from "@/lib/rate-limit/credentials";
import { REFERRAL_COOKIE } from "@/lib/referral/cookie";
import { recordReferralForEmail } from "@/lib/referral/service";
import { safeReturnPath } from "@/lib/routes";
import { z } from "@/lib/validation";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  secondFactorSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

/* The actions behind the local sign-in screens. In Clerk mode the port refuses them with a 400. */

export const signIn = publicAction
  .inputSchema(signInSchema.extend({ next: z.string().optional() }))
  .metadata({ name: "signIn" })
  .action(async ({ parsedInput: { next, ...credentials } }) => {
    await enforceCredentialAttempt(signInAttempts, credentials.email);
    const outcome = await signInWithPassword(credentials);
    if (outcome.twoFactor) {
      return { twoFactor: true as const };
    }
    return {
      twoFactor: false as const,
      redirectTo: `/auth/complete?next=${encodeURIComponent(safeReturnPath(next))}`,
    };
  });

export const confirmSecondFactor = publicAction
  .inputSchema(secondFactorSchema.extend({ next: z.string().optional() }))
  .metadata({ name: "confirmSecondFactor" })
  .action(async ({ parsedInput: { next, code, backup } }) => {
    await enforceCredentialAttempt(secondFactorAttempts, undefined);
    await verifySecondFactor({ code, backup });
    return { redirectTo: `/auth/complete?next=${encodeURIComponent(safeReturnPath(next))}` };
  });

export const signUp = publicAction
  .inputSchema(signUpSchema)
  .metadata({ name: "signUp" })
  .action(async ({ parsedInput }) => {
    await signUpWithPassword(parsedInput);
    // The confirmation link may be opened on another device, where the inviter's link was never
    // followed, so the invitation is recorded here, in the browser that arrived by it.
    const jar = await cookies();
    await recordReferralForEmail(db, {
      email: parsedInput.email,
      rawCode: jar.get(REFERRAL_COOKIE)?.value,
      now: currentInstant(),
    }).catch((error: unknown) => logger.warn("referral not recorded", { error }));
    jar.delete(REFERRAL_COOKIE);
    return { email: parsedInput.email };
  });

/** Answers the same whether or not the account exists, so the form cannot be used to find out. */
export const forgotPassword = publicAction
  .inputSchema(forgotPasswordSchema)
  .metadata({ name: "forgotPassword" })
  .action(async ({ parsedInput }) => {
    await enforceCredentialAttempt(passwordResetAttempts, parsedInput.email);
    await requestPasswordReset(parsedInput);
    return { sent: true };
  });

export const choosePassword = publicAction
  .inputSchema(resetPasswordSchema)
  .metadata({ name: "choosePassword" })
  .action(async ({ parsedInput }) => {
    await enforceCredentialAttempt(passwordResetAttempts, undefined);
    await resetPassword(parsedInput);
    return { done: true };
  });
