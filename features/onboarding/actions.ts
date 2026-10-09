"use server";

import { actionFor } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { finishOnboardingStep } from "@/lib/onboarding/service";
import { sendEvent } from "@/lib/ports/analytics";
import { z } from "@/lib/validation";

/** Marks one first step as done for the signed-in person; finishing the final one is activation. */
export const completeOnboardingStep = actionFor("member")
  .inputSchema(z.object({ step: z.string().min(1).max(40) }))
  .metadata({ name: "completeOnboardingStep" })
  .action(async ({ parsedInput, ctx }) => {
    const { progress, activatedNow } = await finishOnboardingStep(
      db,
      ctx.user.id,
      parsedInput.step,
    );
    if (activatedNow) {
      sendEvent({ name: "activated", accountId: ctx.user.id, data: {} });
    }
    return { doneCount: progress.doneCount, complete: progress.complete };
  });
