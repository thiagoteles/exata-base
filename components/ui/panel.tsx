import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/* Three levels and no fourth. A panel never holds another panel. */
const levels = {
  default: "border border-line bg-surface",
  highlight: "bg-brand-wash",
  danger: "border border-dashed border-danger-ink bg-surface",
} as const;

export function Panel({
  level = "default",
  className,
  ...props
}: ComponentProps<"section"> & { level?: keyof typeof levels }) {
  return (
    <section className={cn("rounded-panel p-panel-inset", levels[level], className)} {...props} />
  );
}
