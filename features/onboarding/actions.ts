"use server";

import { canTick, onboardingSteps } from "@/domain/onboarding/steps";
import { actionFor } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { finishOnboardingStep } from "@/lib/onboarding/service";
import { sendEvent } from "@/lib/ports/analytics";
import { z } from "@/lib/validation";

/**
 * Marks one first step as done for the signed-in person; finishing the final one is activation. A
 * step the app finishes by itself is refused, so nobody becomes activated by asking.
 */
export const completeOnboardingStep = actionFor("member")
  .inputSchema(z.object({ step: z.string().min(1).max(40) }))
  .metadata({ name: "completeOnboardingStep" })
  .action(async ({ parsedInput, ctx }) => {
    if (!canTick(onboardingSteps, parsedInput.step)) {
      throw new DomainError(403);
    }
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
