"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Checklist } from "@/components/patterns/checklist";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { OnboardingProgress, OnboardingStepId } from "@/domain/onboarding/steps";
import { completeOnboardingStep } from "./actions";

/*
 * The first steps of an account, on the shared checklist rail. This part knows what finishing a step
 * does (the action, the refresh, the failure message); the rail knows how it looks.
 */
export function FirstSteps({ progress }: { progress: OnboardingProgress }) {
  const t = useTranslations("onboarding");
  const notify = useToast();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const finish = async (step: string) => {
    setPending(step);
    const result = await completeOnboardingStep({ step });
    setPending(null);
    if (result?.data === undefined) {
      notify({ title: t("failed"), tone: "danger" });
      return;
    }
    router.refresh();
  };

  return (
    <Checklist
      progressLabel={t("progressLabel")}
      countText={t("count", { done: progress.doneCount, total: progress.total })}
      doneText={t("done")}
      nextId={progress.next}
      steps={progress.steps.map((step) => {
        const id = step.id as OnboardingStepId;
        return {
          id: step.id,
          title: t(`steps.${id}.title`),
          help: t(`steps.${id}.help`),
          done: step.done,
        };
      })}
      action={(id) => (
        <Button variant="secondary" loading={pending === id} onClick={() => finish(id)}>
          {t("finish")}
        </Button>
      )}
    />
  );
}
