/*
 * A few categories and one measure each, as horizontal bars with the value at the tip. Every
 * value is written, so there is nothing a hover could add; the bars share one scale from zero.
 */

type Row = { key: string; label: string; value: number; valueText: string };

export function BarList({ rows, label }: { rows: readonly Row[]; label: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(6rem,12rem)_1fr] items-center gap-4">
          <span className="truncate text-body text-ink">{row.label}</span>
          <span className="flex items-center gap-3">
            <span
              className="h-5 rounded-e-mark bg-chart-seq-5"
              style={{ width: `${Math.max((row.value / max) * 100, row.value > 0 ? 1 : 0)}%` }}
            />
            <span className="font-mono text-data text-ink tabular-nums">{row.valueText}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
