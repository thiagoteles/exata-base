import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * A state is a word and a shape; color only confirms. No tilt and no filled background, so the
 * stamp reads the same with no color at all.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const tones = {
  success: {
    classes: "border-success-ink text-success-ink",
    shape: <path d="M2 6.5 5 9.5 10 3" {...stroke} />,
  },
  info: {
    classes: "border-brand-ink text-brand-ink",
    shape: <path d="M6 1 11 6 6 11 1 6Z" fill="currentColor" />,
  },
  warning: {
    classes: "border-warning-ink text-warning-ink",
    shape: <path d="M6 1.5 11 10.5H1Z" fill="currentColor" />,
  },
  danger: {
    classes: "border-danger-ink text-danger-ink",
    shape: <path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" {...stroke} />,
  },
  neutral: {
    classes: "border-ink-muted text-ink-muted",
    shape: <circle cx="6" cy="6" r="4" {...stroke} />,
  },
} as const satisfies Record<string, { classes: string; shape: ReactNode }>;

export type StampTone = keyof typeof tones;

export function Stamp({
  tone,
  children,
  className,
}: {
  tone: StampTone;
  children: ReactNode;
  className?: string;
}) {
  const { classes, shape } = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-stamp border-[1.5px] px-2 text-label font-semibold",
        classes,
        className,
      )}
    >
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
        {shape}
      </svg>
      {children}
    </span>
  );
}
