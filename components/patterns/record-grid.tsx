import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * A record looks like a carefully filled-in document: cells that share borders inside one rounded
 * outline, a label on top of each value, one figure, one stamp. Each cell draws its own rule into
 * the one-pixel gap, so the borders are shared and a row left short shows the surface, not a hole.
 * Rows are ordered to close at three columns; at two a wide cell takes the whole row, so the grid
 * fills each gap with the next narrow cell instead of leaving it beside a wide one.
 */

export function RecordGrid({ children, className, ...props }: ComponentProps<"dl">) {
  return (
    <dl
      className={cn(
        "grid gap-px overflow-hidden rounded-cell border border-line bg-surface md:grid-flow-row-dense md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
      {...props}
    >
      {children}
    </dl>
  );
}

type RecordCellProps = {
  label: string;
  children: ReactNode;
  /** Wider cells for wider data: width by weight, not equal. */
  wide?: boolean;
  /** The state stamp, in the corner of the first cell. */
  stamp?: ReactNode;
};

export function RecordCell({ label, children, wide = false, stamp }: RecordCellProps) {
  return (
    <div
      className={cn(
        "relative bg-surface px-cell-x py-cell-y outline outline-line",
        wide ? "md:col-span-2" : undefined,
      )}
    >
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="mt-1 text-body text-ink">
        {children}
        {stamp === undefined ? null : <div className="absolute top-3 right-4">{stamp}</div>}
      </dd>
    </div>
  );
}

/** The main number of a record: mono, tabular, with the currency mark small and raised. */
export function Figure({ prefix, children }: { prefix?: string; children: string }) {
  return (
    <span className="inline-flex items-start gap-1 font-mono text-figure tabular-nums">
      {prefix === undefined ? null : (
        <sup className="pt-[0.3em] text-[0.6em] leading-none text-ink-muted">{prefix}</sup>
      )}
      {children}
    </span>
  );
}
