import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** One made-up row of the list to come: what it would hold, in the list's own shape. */
type EmptyPreviewRow = {
  key: string;
  title: string;
  /** Numbers, dates and codes, set in mono like the list sets them. */
  details: readonly string[];
  stamp?: ReactNode;
};

type ListEmptyProps = {
  /** What is missing, in one line: "Nenhuma recorrência ainda." */
  title: string;
  /** What the screen will hold and how it gets there, in a sentence or two. */
  body?: string | undefined;
  /** The real first step, as the primary button. */
  action?: ReactNode;
  /** A second way in, such as importing, as a quieter button or link. */
  secondary?: ReactNode;
  /** Two or three made-up rows in the list's shape, so the empty screen shows what it will be. */
  preview?: readonly EmptyPreviewRow[];
};

// The example rows fade out downward, so they read as a glimpse and never as real records.
const fades = ["opacity-75", "opacity-45", "opacity-20"] as const;

/**
 * An empty list says what is missing, what the list is for and the real first step. Beside it, a
 * few made-up rows in the list's own columns show what will be there: a piece of the product, never
 * an illustration. The rows are decoration, hidden from assistive technology, and labelled
 * "Exemplo" on screen so nobody takes them for records.
 */
export function ListEmpty({ title, body, action, secondary, preview }: ListEmptyProps) {
  const t = useTranslations("patterns.empty");
  const hasPreview = preview !== undefined && preview.length > 0;
  // It measures its own width, so it lays out the same inside a list or alone on a page.
  return (
    <div className="@container">
      <div
        className={cn(
          "grid gap-8 py-4",
          hasPreview
            ? "@4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] @4xl:items-center"
            : undefined,
        )}
      >
        <div className="flex max-w-[60ch] flex-col items-start gap-3">
          <p className="text-block-title text-ink">{title}</p>
          {body === undefined ? null : <p className="text-body text-ink-muted">{body}</p>}
          {action === undefined && secondary === undefined ? null : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {action}
              {secondary}
            </div>
          )}
        </div>
        {hasPreview ? (
          <div aria-hidden="true" className="pointer-events-none select-none">
            <p className="mb-2 text-label text-ink-muted">{t("example")}</p>
            {/* Narrow, each example row is a block like the list's own: the title on its line, the
              figures under it. */}
            <div className="flex flex-col border-t border-line">
              {preview.map((row, index) => (
                <div
                  key={row.key}
                  className={cn(
                    "flex min-h-row flex-wrap items-center gap-x-6 gap-y-1 border-b border-line py-3",
                    fades[Math.min(index, fades.length - 1)],
                  )}
                >
                  <span className="min-w-0 basis-full truncate font-semibold text-ink @3xl:flex-1 @3xl:basis-auto">
                    {row.title}
                  </span>
                  {row.details.map((detail) => (
                    <span key={detail} className="font-mono text-data text-ink-muted tabular-nums">
                      {detail}
                    </span>
                  ))}
                  {row.stamp}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * An empty part of a page, inside its section: a low dashed area, like the file field's, that says
 * what is not there yet and, when there is one, the step that fills it. It measures its own width,
 * so the step moves beside the words wherever it is placed.
 */
export function SectionEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <div className="@container">
      <div className="flex flex-col items-start gap-3 rounded-cell border border-dashed border-line-strong px-cell-x py-5 @2xl:flex-row @2xl:items-center @2xl:justify-between">
        <div className="flex max-w-[60ch] flex-col gap-1">
          <p className="text-body text-ink">{title}</p>
          {body === undefined ? null : <p className="text-body-small text-ink-muted">{body}</p>}
        </div>
        {action}
      </div>
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
