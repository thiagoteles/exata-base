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
  /** Numbers, dates and codes: set in mono and aligned to the end of the column. */
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
  title: "max-md:min-w-0 max-md:flex-1 font-semibold",
  status: "max-md:shrink-0",
  detail: "max-md:text-body-small",
} as const;

const rowClasses = "md:grid md:grid-cols-(--columns) md:gap-4";

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
    <table aria-label={label} className="block w-full text-left">
      <thead className="max-md:hidden md:block">
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
                "relative flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3 hover:bg-sunken md:min-h-row md:py-0",
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
                      column.numeric ? "font-mono text-data tabular-nums md:text-end" : undefined,
                      column === firstDetail ? "max-md:basis-full" : undefined,
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
  );
}
