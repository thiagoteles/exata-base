"use client";

import { useState } from "react";
import { type HeatStep, heatStep, takesLightText } from "@/domain/charts/heat";

type Cell = { key: string; label: string; value: number; valueText: string };

type HeatmapProps = {
  /** What the map shows, read aloud and used as the table caption. */
  title: string;
  /** The cells in reading order, filled row by row. */
  cells: readonly Cell[];
  /** How many cells make a row. */
  columns: number;
  legend: { less: string; more: string };
  tableLabel: string;
  headers: { label: string; value: string };
};

const fills: Record<HeatStep, string> = {
  0: "bg-surface border border-line",
  1: "bg-chart-seq-1",
  2: "bg-chart-seq-2",
  3: "bg-chart-seq-3",
  4: "bg-chart-seq-4",
  6: "bg-chart-seq-6",
  7: "bg-chart-seq-7",
};
// The ramp is the same in both themes, so the dark text is the ink in light and the surface in dark.
// An empty cell is the surface itself, so it takes the ink of the theme like any text on it.
const darkText = "text-ink dark:text-surface";
const lightText = "text-surface dark:text-ink";
function textOn(step: HeatStep): string {
  if (step === 0) {
    return "text-ink";
  }
  return takesLightText(step) ? lightText : darkText;
}
const legendSteps = [1, 2, 3, 4, 6, 7] as const;

/**
 * How much each item of a set happened, as a grid of labelled cells whose shade grows with the value
 * (the sequential ramp). Each cell is its own hover and focus target showing the value, the legend
 * says which way the shade runs, and the same values are in the table below, so nothing depends on
 * telling shades apart.
 */
export function Heatmap({ title, cells, columns, legend, tableLabel, headers }: HeatmapProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...cells.map((cell) => cell.value), 0);
  const shown = active === null ? undefined : cells[active];

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="relative">
        <div
          className="grid max-w-xl gap-1.5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {cells.map((cell, index) => {
            const step = heatStep(cell.value, max);
            return (
              <button
                key={cell.key}
                type="button"
                aria-label={`${cell.label}: ${cell.valueText}`}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className={`flex aspect-square cursor-default items-center justify-center rounded-control font-mono text-data font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 ${fills[step]} ${textOn(step)}`}
              >
                {cell.label}
              </button>
            );
          })}
        </div>
        {shown === undefined ? null : (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 left-0 flex -translate-y-full flex-col rounded-control bg-layer px-3 py-2 shadow-layer"
          >
            <span className="font-mono text-data font-semibold text-ink tabular-nums">
              {shown.valueText}
            </span>
            <span className="text-label text-ink-muted">{shown.label}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-label text-ink-muted" aria-hidden="true">
        <span>{legend.less}</span>
        {legendSteps.map((step) => (
          <span key={step} className={`size-4 rounded-stamp ${fills[step]}`} />
        ))}
        <span>{legend.more}</span>
      </div>
      <details className="text-body-small">
        <summary className="cursor-pointer text-ink-muted">{tableLabel}</summary>
        <table className="mt-2 w-full max-w-[32rem] border-collapse text-left">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-line border-b text-label text-ink-muted">
              <th className="py-1 font-medium">{headers.label}</th>
              <th className="py-1 text-right font-medium">{headers.value}</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((cell) => (
              <tr key={cell.key} className="border-line border-b">
                <td className="py-1 font-mono text-data tabular-nums">{cell.label}</td>
                <td className="py-1 text-right font-mono text-data tabular-nums">
                  {cell.valueText}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
