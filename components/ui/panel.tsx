import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "./styles";

/*
 * A panel speaks in one of three tones and there is no fourth: plain, pointing (the brand wash) or
 * the one that holds what destroys. A panel never holds another panel.
 */
const tones = {
  neutral: "border border-line bg-surface",
  info: "bg-brand-wash",
  danger: "border border-dashed border-danger-ink bg-surface",
} as const satisfies Partial<Record<Tone, string>>;

export function Panel({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"section"> & { tone?: keyof typeof tones }) {
  return (
    <section className={cn("rounded-panel p-panel-inset", tones[tone], className)} {...props} />
  );
}
