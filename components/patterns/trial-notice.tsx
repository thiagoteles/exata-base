import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import type { TrialStanding } from "@/domain/billing/trial";

type TrialNoticeProps = {
  standing: TrialStanding;
  /** "Teste gratuito", the name of the thing. */
  title: string;
  /** What the standing says in words: "Faltam 9 dias", already worded by the caller. */
  summary: string;
  /** Names the bar for a screen reader. */
  barLabel: string;
  action?: ReactNode;
};

/**
 * A running trial as a strip across the top of what it covers: the words, then a bar of the days used.
 * The last day and the end change only the bar's tone, since the words already say it. It is not a
 * banner that follows the person around: a screen shows it where the plan is the subject.
 */
export function TrialNotice({ standing, title, summary, barLabel, action }: TrialNoticeProps) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-panel border border-line-strong bg-brand-wash p-panel-inset"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-field-label text-brand-ink">{title}</h3>
        <p className="text-body text-ink">{summary}</p>
      </div>
      <Progress
        label={barLabel}
        value={standing.daysUsed}
        max={standing.totalDays}
        size="sm"
        tone={standing.state === "running" ? "neutral" : "danger"}
      />
      {action === undefined ? null : <div className="self-start">{action}</div>}
    </section>
  );
}
