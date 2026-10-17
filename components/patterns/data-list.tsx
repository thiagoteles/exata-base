import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * A list is rows of 56px separated by a thin rule: no boxes, no zebra. Money and dates sit in
 * mono, and the state stamp has a column of its own. Below `md` each row becomes two lines, the
 * title and the stamp on top and the data in mono underneath; it is never the wide table squeezed.
 * It stays a real table, so screen readers keep the column headers.
 */

export type Column<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** `title` leads each row, `status` holds the stamp, `detail` is everything else. */
  kind?: "title" | "status" | "detail";
  /**
   * Numbers, dates and codes: set in mono and aligned to the end of the column. Never a sentence
   * ("2 anos e 8 meses", "Nenhum animal"): mono spaces it out and it stops reading as words.
   */
  numeric?: boolean;
  /** CSS width of the column on wide screens. Defaults to an equal share. */
  width?: string;
};

type DataListProps<Row> = {
  label: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  getKey: (row: Row) => string;
  /** Makes the title a link and the whole row clickable. */
  rowHref?: (row: Row) => Route;
  /** Shown as a single row when there are no rows: the empty state or the no-results state. */
  emptyState?: ReactNode;
};

const cellKind = {
  title: "@max-3xl:min-w-0 @max-3xl:flex-1 font-semibold",
  status: "@max-3xl:shrink-0",
  detail: "@max-3xl:text-body-small",
} as const;

const rowClasses = "@3xl:grid @3xl:grid-cols-(--columns) @3xl:gap-4";

export function DataList<Row>({
  label,
  columns,
  rows,
  getKey,
  rowHref,
  emptyState,
}: DataListProps<Row>) {
  const style = {
    "--columns": columns.map((column) => column.width ?? "1fr").join(" "),
  } as CSSProperties;
  const firstDetail = columns.find((column) => (column.kind ?? "detail") === "detail");
  return (
    // The list decides by its own width, which the sidebar changes, not by the window's: from 768px
    // its rows are a grid of columns; narrower, each row is a block of two lines.
    <div className="@container">
      <table aria-label={label} className="block w-full text-left">
        {/* With no rows the column names name nothing, and would sit over the empty state's own
            example rows, so the head shows only when there is something under it. */}
        <thead className={rows.length === 0 ? "hidden" : "@max-3xl:hidden @3xl:block"}>
          <tr style={style} className={cn(rowClasses, "border-b border-line pb-2")}>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "text-label font-medium text-ink-muted",
                  column.numeric ? "text-end" : undefined,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block">
          {rows.length === 0 ? (
            <tr className="block">
              <td className="block py-8" colSpan={columns.length}>
                {emptyState}
              </td>
            </tr>
          ) : null}
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr
                key={getKey(row)}
                style={style}
                className={cn(
                  rowClasses,
                  "relative flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3 hover:bg-sunken @3xl:min-h-row @3xl:py-0",
                )}
              >
                {columns.map((column) => {
                  const kind = column.kind ?? "detail";
                  const content = column.cell(row);
                  return (
                    <td
                      key={column.key}
                      className={cn(
                        cellKind[kind],
                        column.numeric
                          ? "font-mono text-data tabular-nums @3xl:text-end"
                          : undefined,
                        column === firstDetail ? "@max-3xl:basis-full" : undefined,
                      )}
                    >
                      {kind === "title" && href !== undefined ? (
                        <Link
                          href={href}
                          className="text-ink after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-focus"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
