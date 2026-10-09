import { arcPath, polar, tickAngles, valueAngle } from "@/domain/figures/arc";
import type { MessageKey } from "@/lib/i18n/message-key";
import { SvgText } from "./svg-text";

type ArcGaugeProps = {
  value: number;
  min: number;
  max: number;
  /** What a screen reader hears: the figure as one picture with its reading. */
  summary: string;
  /** The reading written for the eye, already formatted by the caller. */
  reading: string;
  /** Names what is measured, as a catalog key. */
  captionKey: MessageKey;
  /** The scale's marks, from the lowest to the highest, already formatted. */
  scale?: readonly string[];
};

/*
 * Drawn at the size it is shown, one unit to one pixel, so the interface's text sizes read right
 * inside it. A box narrower than this scales the whole drawing down together.
 */
const WIDTH = 240;
const HEIGHT = 190;
const CENTER = { x: WIDTH / 2, y: 112 };
const RADIUS = 84;
const STROKE = 12;
const SPAN = { from: -120, to: 120 };
const TICK_LENGTH = 6;
const LABEL_RADIUS = RADIUS - STROKE - TICK_LENGTH - 8;

/**
 * A reading on a dial that opens downward. The track is the ink at a faint share (a mix over a token,
 * which a figure may do) and the value is the brand over it, so both follow the theme. The figure is
 * one picture for assistive technology, with the reading in its summary; every mark is decoration.
 */
export function ArcGauge({
  value,
  min,
  max,
  summary,
  reading,
  captionKey,
  scale = [],
}: ArcGaugeProps) {
  const at = valueAngle(value, { min, max }, SPAN);
  const ticks = tickAngles(scale.length, SPAN);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={summary}
      className="w-full max-w-64"
    >
      <path
        d={arcPath(CENTER, RADIUS, SPAN.from, SPAN.to)}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        className="stroke-[color-mix(in_oklch,var(--color-ink)_12%,transparent)]"
      />
      {at > SPAN.from ? (
        <path
          d={arcPath(CENTER, RADIUS, SPAN.from, at)}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="stroke-brand"
        />
      ) : null}
      {ticks.map((angle, index) => {
        const outer = polar(CENTER, RADIUS - STROKE, angle);
        const inner = polar(CENTER, RADIUS - STROKE - TICK_LENGTH, angle);
        const label = polar(CENTER, LABEL_RADIUS, angle);
        return (
          <g key={angle}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              strokeWidth={1}
              className="stroke-line-strong"
            />
            <SvgText
              text={scale[index] ?? ""}
              x={label.x}
              y={label.y + 4}
              variant="data"
              tone="muted"
            />
          </g>
        );
      })}
      <SvgText text={reading} x={CENTER.x} y={CENTER.y + 4} variant="data" />
      <SvgText messageKey={captionKey} x={CENTER.x} y={CENTER.y + 52} tone="muted" />
    </svg>
  );
}
