/*
 * The geometry of a dial: where a value sits on an arc, the path that draws it, and the ticks along
 * it. Angles are in degrees on a compass, 0 at the top and growing clockwise, so a gauge that opens
 * downward runs from a negative angle to a positive one. Pure numbers in and out: a figure only draws
 * what this says.
 */

export type Point = { x: number; y: number };

const DEGREES_TO_RADIANS = Math.PI / 180;
const HALF_TURN = 180;
const FULL_TURN = 360;
/** Coordinates are rounded so a path is stable to read, to compare and to cache. */
const PRECISION = 1000;
const round = (value: number) => Math.round(value * PRECISION) / PRECISION;

export function polar(center: Point, radius: number, degrees: number): Point {
  const radians = degrees * DEGREES_TO_RADIANS;
  return {
    x: round(center.x + radius * Math.sin(radians)),
    y: round(center.y - radius * Math.cos(radians)),
  };
}

/** The path of an arc from one angle to a later one, clockwise. A sweep of a full turn or more is one turn. */
export function arcPath(center: Point, radius: number, from: number, to: number): string {
  const sweep = Math.min(Math.max(to - from, 0), FULL_TURN - 0.01);
  const start = polar(center, radius, from);
  const end = polar(center, radius, from + sweep);
  const large = sweep > HALF_TURN ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
}

/** The angle a value sits at on a scale drawn from `from` to `to`. A value off the scale stays on its end. */
export function valueAngle(
  value: number,
  scale: { min: number; max: number },
  span: { from: number; to: number },
): number {
  if (scale.max <= scale.min) {
    return span.from;
  }
  const share = Math.min(Math.max((value - scale.min) / (scale.max - scale.min), 0), 1);
  return span.from + share * (span.to - span.from);
}

/** `count` angles spread evenly from the start to the end of the span, both ends included. */
export function tickAngles(count: number, span: { from: number; to: number }): number[] {
  if (count < 2) {
    return count === 1 ? [span.from] : [];
  }
  return Array.from(
    { length: count },
    (_, index) => span.from + (index * (span.to - span.from)) / (count - 1),
  );
}
