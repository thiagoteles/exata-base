"use client";

import { Switch as RadixSwitch } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SwitchProps = {
  label: string;
  /** One line under the label, in muted ink: what turning it on does. */
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

/**
 * A setting that is on or off, in a row of its own: the words on the left, the switch at the end.
 * The label names it for a screen reader; the whole row is the target of the label, so tapping the
 * words flips it too.
 */
export function Switch({ label, description, checked, onCheckedChange, disabled }: SwitchProps) {
  return (
    <div className="flex min-h-control items-center justify-between gap-6">
      <label htmlFor={label} className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body text-ink">{label}</span>
        {description === undefined ? null : (
          <span className="max-w-[52ch] text-body-small text-ink-muted">{description}</span>
        )}
      </label>
      <RadixSwitch.Root
        id={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border-2 border-line-strong bg-surface",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          "data-[state=checked]:border-action data-[state=checked]:bg-action",
          "disabled:opacity-50",
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            "block size-4 translate-x-0.5 rounded-full bg-ink",
            "data-[state=checked]:translate-x-5 data-[state=checked]:bg-on-action",
          )}
        />
      </RadixSwitch.Root>
    </div>
  );
}
