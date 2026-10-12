"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Achievements } from "@/components/patterns/achievements";
import { Checklist } from "@/components/patterns/checklist";
import { TrialNotice } from "@/components/patterns/trial-notice";
import { Button } from "@/components/ui/button";
import { trialStanding } from "@/domain/billing/trial";

const stepIds = ["profile", "import", "invite"] as const;
type StepId = (typeof stepIds)[number];

/** A trial a few days in, a checklist worked through, and what is earned and what is ahead. */
export function PaidPatternsDemo({ now }: { now: string }) {
  const t = useTranslations("catalog.paidPatterns");
  const [done, setDone] = useState<readonly StepId[]>(["profile"]);
  const trial = trialStanding({
    endsAt: new Date(new Date(now).getTime() + 5 * 86_400_000),
    totalDays: 14,
    now: new Date(now),
  });
  const next = stepIds.find((id) => !done.includes(id)) ?? null;
  return (
    <div className="grid max-w-4xl gap-12 lg:grid-cols-2">
      <div className="flex flex-col gap-8">
        <TrialNotice
          standing={trial}
          title={t("trial.title")}
          summary={t("trial.summary", { days: trial.daysLeft })}
          barLabel={t("trial.bar")}
          action={<Button variant="secondary">{t("trial.action")}</Button>}
        />
        <Checklist
          progressLabel={t("checklist.progress")}
          countText={t("checklist.count", { done: done.length, total: stepIds.length })}
          doneText={t("checklist.done")}
          nextId={next}
          steps={stepIds.map((id) => ({
            id,
            title: t(`checklist.steps.${id}.title`),
            help: t(`checklist.steps.${id}.help`),
            done: done.includes(id),
          }))}
          action={(id) => (
            <Button
              variant="secondary"
              onClick={() => setDone((current) => [...current, id as StepId])}
            >
              {t("checklist.finish")}
            </Button>
          )}
        />
      </div>
      <Achievements
        earnedText={t("achievements.earned")}
        lockedText={t("achievements.locked")}
        items={[
          {
            id: "first",
            title: t("achievements.first.title"),
            description: t("achievements.first.body"),
            earned: true,
          },
          {
            id: "ten",
            title: t("achievements.ten.title"),
            description: t("achievements.ten.body"),
            earned: false,
            progress: { value: 4, max: 10, label: t("achievements.ten.bar") },
          },
          {
            id: "streak",
            title: t("achievements.streak.title"),
            description: t("achievements.streak.body"),
            earned: false,
          },
        ]}
      />
    </div>
  );
}
