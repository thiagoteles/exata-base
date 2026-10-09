"use client";

import { IconX } from "@tabler/icons-react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { Size, Tone } from "./styles";

type ChipProps = {
  label: string;
  /** Names the remove button, such as "Remover Cobrança". It names what goes, so it is never just "Remover". */
  removeLabel: string;
  onRemove: () => void;
  size?: Size;
  tone?: Tone;
};

const sizes: Record<Size, string> = { sm: "h-segment text-label", md: "h-chip text-label" };
const tones: Record<Tone, string> = {
  neutral: "border-line-strong text-ink hover:border-ink",
  danger: "border-danger text-danger-ink",
};

/**
 * A value the person added and can take back, such as a tag or a recipient. The words are text;
 * only the cross is a button, so a screen reader reads a list of values and not a list of actions.
 * Delete and Backspace on the cross remove it too.
 */
export function Chip({ label, removeLabel, onRemove, size = "md", tone = "neutral" }: ChipProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onRemove();
    }
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-surface ps-3 pe-1",
        sizes[size],
        tones[tone],
      )}
    >
      {label}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        onKeyDown={onKeyDown}
        className="inline-flex size-6 items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
      >
        <IconX className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}
