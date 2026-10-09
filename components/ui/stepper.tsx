import { IconCheck } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { Size } from "./styles";

type StepperProps = {
  /** Names the list for a screen reader, such as "Etapas do cadastro". */
  label: string;
  steps: readonly string[];
  /** The index of the step the person is on. Those before it are done. */
  current: number;
  size?: Size;
};

const markers: Record<Size, string> = { sm: "size-5 text-label", md: "size-7 text-body-small" };
const labels: Record<Size, string> = { sm: "text-body-small", md: "text-body" };

type State = "done" | "current" | "upcoming";

function stateOf(index: number, current: number): State {
  if (index < current) {
    return "done";
  }
  return index === current ? "current" : "upcoming";
}

/**
 * Where a person is in a sequence of steps. Done steps hold a tick, the current one is outlined and
 * named in full, the rest wait. State is also written for a screen reader, since the marker alone
 * is only a picture. It shows the way and does not move: the screen decides when a step is done.
 */
export function Stepper({ label, steps, current, size = "md" }: StepperProps) {
  const t = useTranslations("ui.stepper");
  return (
    <ol aria-label={label} className="flex flex-wrap gap-x-6 gap-y-2">
      {steps.map((name, index) => {
        const state = stateOf(index, current);
        const done = state === "done";
        const here = state === "current";
        return (
          <li
            key={name}
            aria-current={here ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full border-2 tabular-nums",
                markers[size],
                done && "border-ink bg-ink text-surface",
                here && "border-brand text-brand-ink",
                !(done || here) && "border-line-strong text-ink-muted",
              )}
            >
              {done ? <IconCheck className="size-3.5" stroke={3} /> : index + 1}
            </span>
            <span className={cn(labels[size], here ? "font-semibold text-ink" : "text-ink-muted")}>
              {name}
              <span className="sr-only">{` (${t(state)})`}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
