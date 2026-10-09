import type { ReactNode } from "react";
import { Sparkline } from "./sparkline";

type StatTileProps = {
  label: string;
  /** Already formatted: "1.284", "R$ 2.990,00". */
  value: string;
  /** One line under the value, in muted ink: the period, or what the number leaves out. */
  note?: ReactNode;
  trend?: readonly number[];
};

/**
 * One headline number. The value uses proportional figures, which read tighter at this size;
 * tabular figures stay for columns.
 */
export function StatTile({ label, value, note, trend }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface px-cell-x py-cell-y">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-figure text-ink">{value}</dd>
      {trend === undefined ? null : (
        <dd>
          <Sparkline values={trend} />
        </dd>
      )}
      {note === undefined ? null : <dd className="text-body-small text-ink-muted">{note}</dd>}
    </div>
  );
}
