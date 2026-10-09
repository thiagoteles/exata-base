import type { ReactNode } from "react";

/**
 * Empty is the same list with one row that says there is nothing yet and offers the real action.
 * There is no illustration.
 */
export function ListEmpty({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-body text-ink">{title}</p>
      {action}
    </div>
  );
}

const skeletonKeys = (count: number) => Array.from({ length: count }, (_, index) => `row-${index}`);

/** Ghost rows of the same height as real ones. They appear after 180ms, so a fast list never flashes. */
export function ListSkeleton({ rows = 8, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="appear-after flex flex-col">
      {skeletonKeys(rows).map((key) => (
        <div key={key} className="flex min-h-row items-center border-b border-line">
          <div className="h-4 w-1/3 rounded-stamp bg-sunken" />
        </div>
      ))}
    </div>
  );
}
