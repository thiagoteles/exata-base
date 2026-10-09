import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { dateInZone, isTimeZone } from "./calendar";

const zones = ["America/Sao_Paulo", "UTC", "Asia/Tokyo", "Pacific/Kiritimati", "Pacific/Pago_Pago"];
const DAY_MS = 86_400_000;
const instants = fc.date({
  min: new Date("1990-01-01"),
  max: new Date("2060-01-01"),
  noInvalidDate: true,
});

const asUtcMs = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);

describe("calendar days by zone", () => {
  it("is a real ISO date, never more than a day from the UTC date", () => {
    fc.assert(
      fc.property(instants, fc.constantFrom(...zones), (instant, zone) => {
        const local = dateInZone(instant, zone);
        expect(local).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const utc = dateInZone(instant, "UTC");
        expect(Math.abs(asUtcMs(local) - asUtcMs(utc))).toBeLessThanOrEqual(DAY_MS);
      }),
    );
  });

  it("moves forward and never back as the instant moves forward", () => {
    fc.assert(
      fc.property(
        instants,
        fc.integer({ min: 0, max: 3 * DAY_MS }),
        fc.constantFrom(...zones),
        (instant, later, zone) => {
          const after = new Date(instant.getTime() + later);
          expect(dateInZone(after, zone) >= dateInZone(instant, zone)).toBe(true);
        },
      ),
    );
  });

  it("puts the same instant on different days in different zones", () => {
    const instant = new Date("2025-01-01T02:30:00Z");
    expect(dateInZone(instant, "America/Sao_Paulo")).toBe("2024-12-31");
    expect(dateInZone(instant, "UTC")).toBe("2025-01-01");
    expect(dateInZone(instant, "Asia/Tokyo")).toBe("2025-01-01");
    expect(dateInZone(instant, "Pacific/Pago_Pago")).toBe("2024-12-31");
  });

  it("knows a zone from a name that is not one, and throws for the latter", () => {
    for (const zone of zones) {
      expect(isTimeZone(zone)).toBe(true);
    }
    for (const nope of ["", "Mars/Base", "America/", "../etc", "sao paulo", "UTC+3 "]) {
      expect(isTimeZone(nope)).toBe(false);
    }
    expect(() => dateInZone(new Date(), "Mars/Base")).toThrow(RangeError);
  });
});
