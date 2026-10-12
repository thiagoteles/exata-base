"use client";

import { RadioGroup as Primitive } from "radix-ui";
import { type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";
import { type ControlTone, chosenClasses, type Size } from "./styles";

type Option = { value: string; label: string; description?: ReactNode; disabled?: boolean };

type RadioGroupProps = {
  /** Names the group for a screen reader and, shown, for everyone. */
  legend: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly Option[];
  size?: Size;
  tone?: ControlTone;
};

const rings: Record<Size, string> = { sm: "size-4", md: "size-5" };
const dots: Record<Size, string> = { sm: "size-1.5", md: "size-2" };

/**
 * One choice among a few that all deserve their words, listed one under the other. Arrow keys move
 * the choice, and the group is one stop for Tab. For a handful of short choices side by side,
 * `Segmented` is the shorter way.
 */
export function RadioGroup({
  legend,
  value,
  onValueChange,
  options,
  size = "md",
  tone = "neutral",
}: RadioGroupProps) {
  const base = useId();
  return (
    <div role="presentation" className="flex flex-col gap-1">
      <p id={`${base}-legend`} className="text-field-label text-ink">
        {legend}
      </p>
      <Primitive.Root
        aria-labelledby={`${base}-legend`}
        value={value}
        onValueChange={onValueChange}
        className="flex flex-col"
      >
        {options.map((option) => {
          const id = `${base}-${option.value}`;
          return (
            <div key={option.value} className="flex min-h-control items-start gap-3 py-2">
              <Primitive.Item
                id={id}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "mt-0.5 flex shrink-0 items-center justify-center rounded-full border-2 border-line-strong bg-surface",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  "disabled:opacity-50",
                  chosenClasses[tone],
                  rings[size],
                )}
              >
                <Primitive.Indicator className={cn("rounded-full bg-on-action", dots[size])} />
              </Primitive.Item>
              <label htmlFor={id} className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body text-ink">{option.label}</span>
                {option.description === undefined ? null : (
                  <span className="max-w-[52ch] text-body-small text-ink-muted">
                    {option.description}
                  </span>
                )}
              </label>
            </div>
          );
        })}
      </Primitive.Root>
    </div>
  );
}
