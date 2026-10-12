import { IconCheck, IconMinus } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PricingColumn = {
  id: string;
  name: string;
  /** The price already formatted. Free is written as a word, never as zero. */
  price: string;
  /** What the price is for: "por mês", "por ano", "pagamento único". */
  unit: string;
  /** One column may be the one to look at first. */
  highlighted?: boolean;
  /** One line under the price, such as what changes for a subscriber. */
  note?: ReactNode;
  /** Whether this column has each feature, in the order of `features`. */
  has: readonly boolean[];
  /** The button, or nothing. */
  action?: ReactNode;
};

type PricingTableProps = {
  /** Names the table for a screen reader and, shown to everyone, titles it. */
  caption: string;
  features: readonly string[];
  columns: readonly PricingColumn[];
  /** Spoken for a tick and a dash, so the mark is never the only way to know. */
  includedLabel: string;
  excludedLabel: string;
  /** The heading of the first column, the one that lists the features. */
  featuresLabel: string;
};

const edge = "px-4 py-3 md:px-6";

/**
 * Plans side by side as a comparison table: the features run down the left, a column per plan, a
 * tick or a dash where they meet. The table scrolls sideways on a narrow screen with the feature
 * names held in place, so nothing is cut and nothing stacks into separate cards. The plan to look
 * at first is marked by a thicker brand line above it and a tint, and by its place in the markup.
 */
export function PricingTable({
  caption,
  features,
  columns,
  includedLabel,
  excludedLabel,
  featuresLabel,
}: PricingTableProps) {
  // The frame is positioned, so the visually hidden labels in the cells are clipped by it and do not widen the page.
  return (
    <div className="relative overflow-x-auto rounded-cell border border-line">
      <table className="w-full min-w-xl border-collapse text-start">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className={cn(
                edge,
                "sticky start-0 bg-surface text-start align-bottom text-label text-ink-muted",
              )}
            >
              {featuresLabel}
            </th>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  edge,
                  "min-w-52 border-t-4 text-start align-top font-normal",
                  column.highlighted
                    ? "border-brand bg-brand-wash"
                    : "border-transparent bg-surface",
                )}
              >
                <span className="block text-label text-ink-muted">{column.name}</span>
                <span className="mt-2 block text-page-title whitespace-nowrap tabular-nums text-ink">
                  {column.price}
                </span>
                <span className="block text-body-small text-ink-muted">{column.unit}</span>
                {column.note === undefined ? null : (
                  <span className="mt-2 block text-body-small text-ink">{column.note}</span>
                )}
                {column.action === undefined ? null : (
                  <span className="mt-4 block">{column.action}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, row) => (
            <tr key={feature} className="border-t border-line">
              <th
                scope="row"
                className={cn(
                  edge,
                  "sticky start-0 bg-surface text-start text-body font-normal text-ink",
                )}
              >
                {feature}
              </th>
              {columns.map((column) => {
                const included = column.has[row] === true;
                const spoken = included ? includedLabel : excludedLabel;
                return (
                  <td
                    key={column.id}
                    className={cn(edge, column.highlighted ? "bg-brand-wash" : "bg-surface")}
                  >
                    {included ? (
                      <IconCheck
                        className="size-5 text-success-ink"
                        stroke={2.5}
                        aria-hidden="true"
                      />
                    ) : (
                      <IconMinus className="size-5 text-ink-muted" aria-hidden="true" />
                    )}
                    <span className="sr-only">{spoken}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
