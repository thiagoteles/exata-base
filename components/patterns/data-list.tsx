import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * A list sits on one surface with the record's outline: the column names on a sunken band, then
 * rows of 56px separated by a thin rule, with the cells' own padding at both ends; no zebra. Money
 * and dates sit in mono, and the state stamp has a column of its own. The title always starts the
 * row on the left, even when it is a code. Below `md` each row becomes two lines, the title and the
 * stamp on top and the data in mono underneath; it is never the wide table squeezed. It stays a
 * real table, so screen readers keep the column headers.
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

// On a narrow list the title and the stamp share the first line, whatever the column order, and
// the data follows under them.
const cellKind = {
  title: "@max-3xl:order-1 @max-3xl:min-w-0 @max-3xl:flex-1 font-semibold",
  status: "@max-3xl:order-2 @max-3xl:shrink-0",
  detail: "@max-3xl:order-3 @max-3xl:text-body-small",
} as const;

const rowClasses = "px-cell-x @3xl:grid @3xl:grid-cols-(--columns) @3xl:gap-x-6";

/** Numbers line up at the end of their column, except the title, which always starts the row. */
const endAligned = (column: { numeric?: boolean; kind?: string }) =>
  column.numeric === true && column.kind !== "title";

/** One cell's classes: its kind, mono for numbers, and how it sits on a narrow list. */
function cellClasses<Row>(column: Column<Row>, content: ReactNode, firstDetail: boolean) {
  return cn(
    cellKind[column.kind ?? "detail"],
    column.numeric ? "font-mono text-data tabular-nums" : undefined,
    endAligned(column) ? "@3xl:text-end" : undefined,
    firstDetail ? "@max-3xl:basis-full" : undefined,
    // A blank cell keeps its column on a wide list; on a narrow one it would leave a gap in the
    // line of data.
    content === "" || content === null ? "@max-3xl:hidden" : undefined,
  );
}

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
      <table
        aria-label={label}
        className={cn(
          "block w-full text-left",
          rows.length === 0
            ? undefined
            : "overflow-hidden rounded-cell border border-line bg-surface",
        )}
      >
        {/* With no rows the column names name nothing, and would sit over the empty state's own
            example rows, so the head shows only when there is something under it. */}
        <thead className={rows.length === 0 ? "hidden" : "@max-3xl:hidden @3xl:block"}>
          <tr style={style} className={cn(rowClasses, "border-b border-line bg-sunken py-2.5")}>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "text-label font-medium text-ink-muted",
                  endAligned(column) ? "text-end" : undefined,
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
                  "relative flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3 transition-colors duration-120 ease-enter last:border-b-0 hover:bg-sunken @3xl:min-h-row @3xl:py-0",
                )}
              >
                {columns.map((column) => {
                  const kind = column.kind ?? "detail";
                  const content = column.cell(row);
                  return (
                    <td
                      key={column.key}
                      className={cellClasses(column, content, column === firstDetail)}
                    >
                      {kind === "title" && href !== undefined ? (
                        <Link
                          href={href}
                          className="text-ink outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus"
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
