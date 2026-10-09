import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { arcPath, polar, tickAngles, valueAngle } from "./arc";

const center = { x: 50, y: 50 };

describe("a dial's geometry", () => {
  it("puts angle zero at the top and grows clockwise", () => {
    expect(polar(center, 40, 0)).toEqual({ x: 50, y: 10 });
    expect(polar(center, 40, 90)).toEqual({ x: 90, y: 50 });
    expect(polar(center, 40, 180)).toEqual({ x: 50, y: 90 });
    expect(polar(center, 40, -90)).toEqual({ x: 10, y: 50 });
  });

  it("draws an arc clockwise and flags the long way round past a half turn", () => {
    expect(arcPath(center, 40, -90, 90)).toBe("M 10 50 A 40 40 0 0 1 90 50");
    expect(arcPath(center, 40, -120, 120)).toMatch(/ 0 1 1 /);
    // No sweep is a point, not a stray full circle.
    const { x, y } = polar(center, 40, 30);
    expect(arcPath(center, 40, 30, 30)).toBe(`M ${x} ${y} A 40 40 0 0 1 ${x} ${y}`);
  });

  it("places a value on the span, clamped to its ends", () => {
    const scale = { min: 0, max: 100 };
    const span = { from: -120, to: 120 };
    expect(valueAngle(0, scale, span)).toBe(-120);
    expect(valueAngle(50, scale, span)).toBe(0);
    expect(valueAngle(100, scale, span)).toBe(120);
    expect(valueAngle(-30, scale, span)).toBe(-120);
    expect(valueAngle(400, scale, span)).toBe(120);
    expect(valueAngle(5, { min: 3, max: 3 }, span)).toBe(-120);
  });

  it("spreads ticks evenly with both ends included", () => {
    expect(tickAngles(5, { from: -120, to: 120 })).toEqual([-120, -60, 0, 60, 120]);
    expect(tickAngles(1, { from: -120, to: 120 })).toEqual([-120]);
    expect(tickAngles(0, { from: -120, to: 120 })).toEqual([]);
  });
});

describe("a dial's geometry, in general", () => {
  it("keeps every point at the radius from the center", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: -720, max: 720 }),
        (radius, degrees) => {
          const point = polar(center, radius, degrees);
          expect(Math.hypot(point.x - center.x, point.y - center.y)).toBeCloseTo(radius, 2);
        },
      ),
    );
  });

  it("never moves a value backward on the span as the value grows", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -50, max: 150, noNaN: true }),
        fc.double({ min: -50, max: 150, noNaN: true }),
        (a, b) => {
          const scale = { min: 0, max: 100 };
          const span = { from: -120, to: 120 };
          const [low, high] = a <= b ? [a, b] : [b, a];
          expect(valueAngle(low, scale, span)).toBeLessThanOrEqual(valueAngle(high, scale, span));
          expect(valueAngle(a, scale, span)).toBeGreaterThanOrEqual(-120);
          expect(valueAngle(a, scale, span)).toBeLessThanOrEqual(120);
        },
      ),
    );
  });

  it("gives as many ticks as asked, in order", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 60 }), (count) => {
        const ticks = tickAngles(count, { from: -120, to: 120 });
        expect(ticks).toHaveLength(count);
        expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
      }),
    );
  });
});
