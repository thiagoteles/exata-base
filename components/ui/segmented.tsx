"use client";

import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/cn";

type SegmentedProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
};

/** A few exclusive choices side by side. The chosen one is filled with ink, not with the brand. */
export function Segmented({ label, value, onValueChange, options }: SegmentedProps) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      className="inline-flex rounded-control border-2 border-line-strong bg-surface p-0.5"
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            "h-segment rounded-cell px-4 text-button font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            "data-[state=checked]:bg-action data-[state=checked]:text-on-action",
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
