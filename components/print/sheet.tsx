import type { ReactNode } from "react";

/*
 * One printed sheet. On screen it is a page of paper on the desk, as wide as an A4; in print it
 * gives up its frame and margins to the page box, which draws them. Ink on paper comes from the
 * print tokens, so nothing here picks a color for the printer.
 */
export function Sheet({ children }: { children: ReactNode }) {
  return (
    <article className="mx-auto flex w-full max-w-sheet flex-col gap-8 border border-line bg-surface p-sheet-margin text-ink print:max-w-none print:border-0 print:p-0">
      {children}
    </article>
  );
}

/** The brand and the date on the left and right of the title, ruled underneath. */
export function SheetHeader({
  brand,
  title,
  date,
}: {
  brand: string;
  title: string;
  date: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-2 border-ink pb-3">
      <div className="flex flex-col gap-1">
        <p className="text-label text-ink-muted">{brand}</p>
        <h1 className="text-page-title text-ink">{title}</h1>
      </div>
      <p className="font-mono text-data text-ink-muted tabular-nums">{date}</p>
    </header>
  );
}

export function SheetFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="mt-auto border-t border-line pt-3 text-body-small text-ink-muted">
      {children}
    </footer>
  );
}

/** A block the printer must not split across two pages. */
export function NoBreak({ children }: { children: ReactNode }) {
  return <div className="break-inside-avoid">{children}</div>;
}

type PrintTableProps = {
  caption: string;
  head: readonly string[];
  rows: readonly (readonly ReactNode[])[];
};

/** A table whose head repeats on every page it runs onto, and whose rows are never cut in half. */
export function PrintTable({ caption, head, rows }: PrintTableProps) {
  return (
    <table className="w-full border-collapse text-left text-body">
      <caption className="pb-2 text-left text-block-title text-ink">{caption}</caption>
      <thead className="table-header-group">
        <tr className="border-b-2 border-ink">
          {head.map((label) => (
            <th key={label} scope="col" className="py-2 pr-4 text-label font-semibold text-ink">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, row) => (
          // The rows have no identity of their own; they are printed once, in order.
          // biome-ignore lint/suspicious/noArrayIndexKey: static rows printed in order
          <tr key={row} className="break-inside-avoid border-b border-line">
            {cells.map((cell, column) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static cells printed in order
              <td key={column} className="py-2 pr-4 align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
