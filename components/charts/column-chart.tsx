"use client";

import { useEffect, useRef, useState } from "react";
import { niceTicks } from "@/domain/charts/scale";
import { formatBRL, toCents } from "@/lib/money";

type Column = { key: string; tick: string; label: string; value: number; valueText: string };

type ColumnChartProps = {
  /** What the chart shows, read aloud and used as the table caption. */
  title: string;
  columns: readonly Column[];
  /** How axis values read: a count, or cents shown as reais. */
  axis: "count" | "brl";
  tableLabel: string;
  headers: { label: string; value: string };
};

const HEIGHT = 220;
const DEFAULT_WIDTH = 960;
const MIN_WIDTH = 280;
const AXIS_WIDTH = 72;
const TOP = 8;
const BOTTOM = 28;
const MAX_BAR = 24;
const END_RADIUS = 4;
/* The room a day label needs, so labels never touch; the last day always has one. */
const LABEL_ROOM = 56;

/** A column with a rounded data end and a square foot on the baseline. */
function columnPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(END_RADIUS, width / 2, height);
  const bottom = y + height;
  return `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${bottom}Z`;
}

/**
 * One measure over days. Each column is its own hover and focus target, wider than the mark, and
 * shows the day and the value; the same values are in the table below, so nothing depends on
 * hovering. The single series needs no legend: the title says what is plotted.
 */
const counts = new Intl.NumberFormat("pt-BR");
const axisText = (axis: ColumnChartProps["axis"], value: number) =>
  axis === "brl" ? formatBRL(toCents(Math.round(value))) : counts.format(value);

export function ColumnChart({ title, columns, axis, tableLabel, headers }: ColumnChartProps) {
  const [active, setActive] = useState<number | null>(null);
  // Drawn at the container's real width, so axis text keeps its token size instead of scaling.
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const element = frame.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        setWidth(Math.max(entry.contentRect.width, MIN_WIDTH));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const ticks = niceTicks(Math.max(...columns.map((column) => column.value), 0), {
    integer: axis === "count",
  });
  const top = ticks.at(-1) ?? 1;
  const band = (width - AXIS_WIDTH) / Math.max(columns.length, 1);
  const every = Math.max(1, Math.ceil(LABEL_ROOM / band));
  const barWidth = Math.min(MAX_BAR, Math.max(band - 2, 2));
  const plot = HEIGHT - TOP - BOTTOM;
  const yOf = (value: number) => TOP + plot - (value / top) * plot;
  const shown = active === null ? undefined : columns[active];

  return (
    <figure className="flex flex-col gap-3">
      <div ref={frame} className="relative">
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
          height={HEIGHT}
          className="block max-w-full overflow-visible"
          role="img"
          aria-label={title}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={AXIS_WIDTH}
                x2={width}
                y1={yOf(tick)}
                y2={yOf(tick)}
                className="stroke-line"
                strokeWidth={1}
              />
              <text
                x={AXIS_WIDTH - 8}
                y={yOf(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-ink-muted text-label tabular-nums"
              >
                {axisText(axis, tick)}
              </text>
            </g>
          ))}
          {columns.map((column, index) => {
            const x = AXIS_WIDTH + index * band;
            const y = yOf(column.value);
            const height = HEIGHT - BOTTOM - y;
            return (
              <g key={column.key}>
                {height > 0 ? (
                  <path
                    d={columnPath(x + (band - barWidth) / 2, y, barWidth, height)}
                    className={active === index ? "fill-chart-seq-6" : "fill-chart-seq-5"}
                  />
                ) : null}
                {(columns.length - 1 - index) % every === 0 ? (
                  <text
                    x={x + band / 2}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className="fill-ink-muted text-label tabular-nums"
                  >
                    {column.tick}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        {/* One transparent target per column, the full band wide: the pointer and the keyboard
            reach the same values, and the target is wider than the painted bar. */}
        <div
          className="absolute flex"
          style={{
            left: `${(AXIS_WIDTH / width) * 100}%`,
            right: 0,
            top: `${(TOP / HEIGHT) * 100}%`,
            bottom: `${(BOTTOM / HEIGHT) * 100}%`,
          }}
        >
          {columns.map((column, index) => (
            <button
              key={column.key}
              type="button"
              aria-label={`${column.label}: ${column.valueText}`}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              className="h-full flex-1 cursor-default focus-visible:outline-2 focus-visible:outline-focus"
            />
          ))}
        </div>
        {shown === undefined || active === null ? null : (
          <div
            role="status"
            className="pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col rounded-control bg-layer px-3 py-2 shadow-layer"
            style={{ left: `${((AXIS_WIDTH + (active + 0.5) * band) / width) * 100}%` }}
          >
            <span className="font-mono text-data font-semibold text-ink tabular-nums">
              {shown.valueText}
            </span>
            <span className="text-label text-ink-muted">{shown.label}</span>
          </div>
        )}
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
            {columns.map((column) => (
              <tr key={column.key} className="border-line border-b">
                <td className="py-1 font-mono text-data tabular-nums">{column.label}</td>
                <td className="py-1 text-right font-mono text-data tabular-nums">
                  {column.valueText}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
