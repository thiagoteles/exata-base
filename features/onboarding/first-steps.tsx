"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { OnboardingProgress, OnboardingStepId } from "@/domain/onboarding/steps";
import { completeOnboardingStep } from "./actions";

type StepState = "done" | "open" | "waiting";

const markerClasses: Record<StepState, string> = {
  done: "border-success-ink text-success-ink",
  open: "border-brand bg-brand-wash text-brand-ink",
  waiting: "border-line bg-surface text-ink-muted",
};

function stateOf(step: { done: boolean }, open: boolean): StepState {
  if (step.done) {
    return "done";
  }
  return open ? "open" : "waiting";
}

/*
 * The first steps as a rail: a line that fills as steps are done, a marker for each, and the open
 * step named in full with the one button that finishes it. Finished steps shrink to a single line.
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
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={t("progressLabel")}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.doneCount}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${(progress.doneCount / Math.max(progress.total, 1)) * 100}%` }}
          />
        </div>
        <span className="tabular-nums text-body-small text-ink-muted">
          {t("count", { done: progress.doneCount, total: progress.total })}
        </span>
      </div>
      <ol className="flex flex-col">
        {progress.steps.map((step, index) => {
          const open = step.id === progress.next;
          const id = step.id as OnboardingStepId;
          const state = stateOf(step, open);
          return (
            <li
              key={step.id}
              className="relative ml-4 border-l border-line pb-6 pl-8 last:border-transparent last:pb-0"
              data-state={state}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0 -left-4 flex size-8 items-center justify-center rounded-full border text-body-small tabular-nums ${markerClasses[state]}`}
              >
                {step.done ? "✓" : index + 1}
              </span>
              <div className="flex min-h-8 flex-col justify-center gap-2">
                <p
                  className={
                    step.done ? "text-body-small text-ink-muted" : "text-field-label text-ink"
                  }
                >
                  {t(`steps.${id}.title`)}
                  {step.done ? <span className="sr-only"> {t("done")}</span> : null}
                </p>
                {open ? (
                  <>
                    <p className="max-w-[52ch] text-body-small text-ink-muted">
                      {t(`steps.${id}.help`)}
                    </p>
                    <div className="self-start">
                      <Button
                        variant="secondary"
                        loading={pending === step.id}
                        onClick={() => finish(step.id)}
                      >
                        {t("finish")}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
