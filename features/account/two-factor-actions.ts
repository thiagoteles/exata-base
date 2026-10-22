"use server";

import { refresh } from "next/cache";
import { actionFor } from "@/lib/actions/client";
import { qrPath } from "@/lib/documents/qr";
import { disableSecondFactor, enableSecondFactor, verifySecondFactor } from "@/lib/ports/auth";
import { secondFactorAttempts } from "@/lib/rate-limit/credential-rules";
import { enforceCredentialAttempt } from "@/lib/rate-limit/credentials";
import { secondFactorCodeSchema, secondFactorPasswordSchema } from "./schema";

/*
 * Turning the authenticator on is two steps: the password reveals the code and the backup codes,
 * and a code from the app confirms them. The backup codes are returned once, on that first step.
 */

function secretFromUri(totpUri: string): string {
  return new URL(totpUri).searchParams.get("secret") ?? "";
}

export const beginSecondFactor = actionFor("member")
  .inputSchema(secondFactorPasswordSchema)
  .metadata({ name: "beginSecondFactor" })
  .action(async ({ parsedInput }) => {
    const started = await enableSecondFactor(parsedInput);
    return {
      code: qrPath(started.totpUri),
      secret: secretFromUri(started.totpUri),
      backupCodes: started.backupCodes,
    };
  });

export const finishSecondFactor = actionFor("member")
  .inputSchema(secondFactorCodeSchema)
  .metadata({ name: "finishSecondFactor" })
  .action(async ({ parsedInput }) => {
    await enforceCredentialAttempt(secondFactorAttempts, undefined);
    await verifySecondFactor({ code: parsedInput.code, backup: false });
    refresh();
    return { enabled: true };
  });

export const turnOffSecondFactor = actionFor("member")
  .inputSchema(secondFactorPasswordSchema)
  .metadata({ name: "turnOffSecondFactor" })
  .action(async ({ parsedInput }) => {
    await disableSecondFactor(parsedInput);
    refresh();
    return { enabled: false };
  });
