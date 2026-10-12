import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";

type ChecklistStep = { id: string; title: string; help?: string; done: boolean };

type ChecklistProps = {
  /** Names the bar for a screen reader. */
  progressLabel: string;
  /** What the bar says in words, such as "1 de 3". */
  countText: string;
  /** Said for a screen reader after a finished step's title, such as "(feito)". */
  doneText: string;
  steps: readonly ChecklistStep[];
  /** The step to do now: it is named in full and gets the action. */
  nextId: string | null;
  /** The control that finishes the open step. The checklist places it; it does not know what it does. */
  action: (id: string) => ReactNode;
};

type State = "done" | "open" | "waiting";

const markerClasses: Record<State, string> = {
  done: "border-success-ink text-success-ink",
  open: "border-brand bg-brand-wash text-brand-ink",
  waiting: "border-line bg-surface text-ink-muted",
};

function stateOf(step: { done: boolean }, open: boolean): State {
  if (step.done) {
    return "done";
  }
  return open ? "open" : "waiting";
}

/**
 * Steps as a rail: a bar of how far, then a line down the left with a marker for each step, the open
 * one named in full with its help and its one control, and the finished ones shrunk to a single line.
 * It is the shape for the first steps of an account and for any short list that is worked through.
 */
export function Checklist({
  progressLabel,
  countText,
  doneText,
  steps,
  nextId,
  action,
}: ChecklistProps) {
  const doneCount = steps.filter((step) => step.done).length;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress
            label={progressLabel}
            value={doneCount}
            max={Math.max(steps.length, 1)}
            size="sm"
          />
        </div>
        <span className="tabular-nums text-body-small text-ink-muted">{countText}</span>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const open = step.id === nextId;
          const state = stateOf(step, open);
          return (
            <li
              key={step.id}
              data-state={state}
              className="relative ml-4 border-l border-line pb-6 pl-8 last:border-transparent last:pb-0"
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
                  {step.title}
                  {step.done ? <span className="sr-only"> {doneText}</span> : null}
                </p>
                {open ? (
                  <>
                    {step.help === undefined ? null : (
                      <p className="max-w-[52ch] text-body-small text-ink-muted">{step.help}</p>
                    )}
                    <div className="self-start">{action(step.id)}</div>
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
