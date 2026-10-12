import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Size } from "./styles";

type Shape = "line" | "block" | "circle";

type SkeletonProps = {
  shape?: Shape;
  size?: Size;
  /** Tailwind width, such as "w-1/3". A line is full width by default. */
  className?: string;
};

const shapes: Record<Shape, Record<Size, string>> = {
  line: { sm: "h-3 rounded-stamp", md: "h-4 rounded-stamp" },
  block: { sm: "h-row rounded-cell", md: "h-28 rounded-cell" },
  circle: { sm: "size-control rounded-full", md: "size-tab rounded-full" },
};

/** A quiet placeholder shape. It does not pulse: a still gray reads as waiting without the motion. */
export function Skeleton({ shape = "line", size = "md", className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("bg-sunken", shapes[shape][size], className)} />;
}

/**
 * Ghost content standing in for what is loading. It is announced once, as a status, and appears only
 * after a short delay so a fast load never flashes it.
 */
export function SkeletonGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} className="appear-after flex flex-col gap-3">
      {children}
    </div>
  );
}
