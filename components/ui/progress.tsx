"use client";

import { Progress as Primitive } from "radix-ui";
import { cn } from "@/lib/cn";
import type { ControlTone, Size } from "./styles";

type ProgressProps = {
  /** What is being measured, for a screen reader and, with `showValue`, for everyone. */
  label: string;
  value: number;
  max?: number;
  /** Writes "value of max" beside the bar. */
  showValue?: boolean;
  size?: Size;
  tone?: ControlTone;
};

const tracks: Record<Size, string> = { sm: "h-1.5", md: "h-2.5" };
const fills: Record<ControlTone, string> = { neutral: "bg-action", danger: "bg-danger" };

/**
 * How far a task has got, a thing that is going somewhere. Use `Meter` for a quantity that just is
 * (storage used, a score). The fill never animates when the person asked for less motion.
 */
export function Progress({
  label,
  value,
  max = 100,
  showValue = false,
  size = "md",
  tone = "neutral",
}: ProgressProps) {
  const share = Math.min(Math.max(value / max, 0), 1);
  return (
    <div className="flex flex-col gap-1.5">
      {showValue ? (
        <div className="flex items-baseline justify-between gap-4 text-body-small">
          <span className="text-ink">{label}</span>
          <span className="tabular-nums text-ink-muted">{`${value} / ${max}`}</span>
        </div>
      ) : null}
      <Primitive.Root
        value={value}
        max={max}
        aria-label={label}
        className={cn("w-full overflow-hidden rounded-full bg-sunken", tracks[size])}
      >
        <Primitive.Indicator
          className={cn(
            "h-full w-full rounded-full transition-transform duration-300 ease-enter motion-reduce:transition-none",
            fills[tone],
          )}
          style={{ transform: `translateX(-${(1 - share) * 100}%)` }}
        />
      </Primitive.Root>
    </div>
  );
}
