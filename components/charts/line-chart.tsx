"use client";

import { useState } from "react";
import { niceTicks } from "@/domain/charts/scale";
import { formatBRL, toCents } from "@/lib/money";
import { useFrameWidth } from "./frame-width";

type Point = { key: string; tick: string; label: string; value: number; valueText: string };

type LineChartProps = {
  /** What the chart shows, read aloud and used as the table caption. */
  title: string;
  points: readonly Point[];
  /** How axis values read: a count, or cents shown as reais. */
  axis: "count" | "brl";
  tableLabel: string;
  headers: { label: string; value: string };
};

const HEIGHT = 220;
const AXIS_WIDTH = 72;
const TOP = 12;
const BOTTOM = 28;
const DOT = 3.5;
const ACTIVE_DOT = 5.5;
/* The room a tick label needs, so labels never touch; the last point always has one. */
const LABEL_ROOM = 56;

const counts = new Intl.NumberFormat("pt-BR");
const axisText = (axis: LineChartProps["axis"], value: number) =>
  axis === "brl" ? formatBRL(toCents(Math.round(value))) : counts.format(value);

/**
 * One measure along an ordered axis (months, draws). Each point has its own hover and focus target,
 * as wide as the space between points, showing the label and the value; the same values are in the
 * table below, so nothing depends on hovering. The single series needs no legend: the title says
 * what is plotted.
 */
export function LineChart({ title, points, axis, tableLabel, headers }: LineChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const [frame, width] = useFrameWidth();
  const ticks = niceTicks(Math.max(...points.map((point) => point.value), 0), {
    integer: axis === "count",
  });
  const top = ticks.at(-1) ?? 1;
  const band = (width - AXIS_WIDTH) / Math.max(points.length, 1);
  const every = Math.max(1, Math.ceil(LABEL_ROOM / band));
  const plot = HEIGHT - TOP - BOTTOM;
  const xOf = (index: number) => AXIS_WIDTH + (index + 0.5) * band;
  const yOf = (value: number) => TOP + plot - (value / top) * plot;
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index)},${yOf(point.value)}`)
    .join("");
  const shown = active === null ? undefined : points[active];

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
          <path
            d={path}
            fill="none"
            className="stroke-chart-1"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {points.map((point, index) => (
            <g key={point.key}>
              <circle
                cx={xOf(index)}
                cy={yOf(point.value)}
                r={active === index ? ACTIVE_DOT : DOT}
                className="fill-chart-1 stroke-surface"
                strokeWidth={2}
              />
              {(points.length - 1 - index) % every === 0 ? (
                <text
                  x={xOf(index)}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-ink-muted text-label tabular-nums"
                >
                  {point.tick}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
        {/* One transparent target per point, the full band wide: the pointer and the keyboard reach
            the same values, and the target is wider than the painted dot. */}
        <div
          className="absolute flex"
          style={{
            left: `${(AXIS_WIDTH / width) * 100}%`,
            right: 0,
            top: `${(TOP / HEIGHT) * 100}%`,
            bottom: `${(BOTTOM / HEIGHT) * 100}%`,
          }}
        >
          {points.map((point, index) => (
            <button
              key={point.key}
              type="button"
              aria-label={`${point.label}: ${point.valueText}`}
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
            style={{ left: `${(xOf(active) / width) * 100}%` }}
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
            {points.map((point) => (
              <tr key={point.key} className="border-line border-b">
                <td className="py-1 font-mono text-data tabular-nums">{point.label}</td>
                <td className="py-1 text-right font-mono text-data tabular-nums">
                  {point.valueText}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
