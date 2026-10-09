"use client";

import { IconCheck, IconMinus } from "@tabler/icons-react";
import { Checkbox as Primitive } from "radix-ui";
import { type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";
import { chosenClasses, type Size, type Tone } from "./styles";

type CheckboxProps = {
  label: string;
  /** One line under the label, in muted ink. */
  description?: ReactNode;
  /** `"indeterminate"` is for a parent that stands for children only some of which are chosen. */
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: Size;
  tone?: Tone;
};

const boxes: Record<Size, string> = { sm: "size-4", md: "size-5" };
const marks: Record<Size, string> = { sm: "size-3", md: "size-4" };

/**
 * A yes or no that sits in a list of others, with the words beside the box. The whole row is the
 * label, so the words are a target too. A box that stands for a partial selection shows a bar, not a tick.
 */
export function Checkbox({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  size = "md",
  tone = "neutral",
}: CheckboxProps) {
  const id = useId();
  return (
    <div className="flex min-h-control items-start gap-3 py-2">
      <Primitive.Root
        id={id}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        disabled={disabled}
        className={cn(
          "mt-0.5 flex shrink-0 items-center justify-center rounded-stamp border-2 border-line-strong bg-surface",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          "disabled:opacity-50",
          "data-[state=indeterminate]:border-action data-[state=indeterminate]:bg-action data-[state=indeterminate]:text-on-action",
          chosenClasses[tone],
          boxes[size],
        )}
      >
        <Primitive.Indicator>
          {checked === "indeterminate" ? (
            <IconMinus className={marks[size]} stroke={3} aria-hidden="true" />
          ) : (
            <IconCheck className={marks[size]} stroke={3} aria-hidden="true" />
          )}
        </Primitive.Indicator>
      </Primitive.Root>
      <label htmlFor={id} className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body text-ink">{label}</span>
        {description === undefined ? null : (
          <span className="max-w-[52ch] text-body-small text-ink-muted">{description}</span>
        )}
      </label>
    </div>
  );
}
