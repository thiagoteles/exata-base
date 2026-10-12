/*
 * A trend with no axis, for a stat tile. The line is in the muted ink and only the last point
 * wears the series color, so the eye lands on now. It is decoration for the number beside it,
 * which already says the value, so it is hidden from assistive technology.
 */

const WIDTH = 120;
const HEIGHT = 32;
const PAD = 4;

export function Sparkline({ values }: { values: readonly number[] }) {
  if (values.length < 2) {
    return null;
  }
  const max = Math.max(...values, 1);
  const stepX = (WIDTH - PAD * 2) / (values.length - 1);
  const points = values.map(
    (value, index) =>
      [PAD + index * stepX, HEIGHT - PAD - (value / max) * (HEIGHT - PAD * 2)] as const,
  );
  const [lastX, lastY] = points.at(-1) ?? [0, 0];
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-8 w-30 overflow-visible"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        className="stroke-ink-muted"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={4} className="fill-chart-1 stroke-surface" strokeWidth={2} />
    </svg>
  );
}
