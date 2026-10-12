import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { dateInSaoPaulo, formatDate, formatInstantDate, type IsoDate, parseDate } from "./date";

const HOUR = 3_600_000;
const SAO_PAULO_OFFSET = -3 * HOUR;
// Brazil dropped daylight saving time in 2019; from then on the offset is a constant UTC-3.
const sinceFixedOffset = fc.date({
  min: new Date("2019-03-01T00:00:00Z"),
  max: new Date("2099-12-31T23:59:59Z"),
  noInvalidDate: true,
});

describe("calendar dates", () => {
  it("survive dd/mm/aaaa and back for every real date", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("1900-01-01"), max: new Date("2199-12-31"), noInvalidDate: true }),
        (date) => {
          const typed = formatDate(date.toISOString().slice(0, 10) as never);
          return parseDate(typed) === date.toISOString().slice(0, 10);
        },
      ),
    );
  });

  it("refuse impossible dates", () => {
    for (const input of [
      "31/02/2024",
      "29/02/2023",
      "00/01/2024",
      "12/13/2024",
      "1/1/2024",
      "2024-01-01",
    ]) {
      expect(parseDate(input)).toBeNull();
    }
    expect(parseDate("29/02/2024")).toBe("2024-02-29");
  });
});

describe("instants in America/Sao_Paulo", () => {
  it("fall on the São Paulo calendar day, not the UTC one", () => {
    fc.assert(
      fc.property(sinceFixedOffset, (instant) => {
        const local = new Date(instant.getTime() + SAO_PAULO_OFFSET).toISOString().slice(0, 10);
        return dateInSaoPaulo(instant) === local;
      }),
    );
  });

  it("show late evening in São Paulo as that same day", () => {
    expect(formatInstantDate(new Date("2025-01-01T02:30:00Z"))).toBe("31/12/2024");
  });

  it("show the day of the person's own zone when the screen knows it", () => {
    const instant = new Date("2025-01-01T02:30:00Z");
    expect(formatInstantDate(instant, "Asia/Tokyo")).toBe("01/01/2025");
    expect(formatInstantDate(instant, "America/Sao_Paulo")).toBe("31/12/2024");
    expect(formatInstantDate(instant, "UTC")).toBe("01/01/2025");
  });
});

describe("dates in another language", () => {
  it("keep dd/mm/aaaa in the default language and follow the language's short form elsewhere", () => {
    expect(formatDate("2025-01-31" as IsoDate, "pt-BR")).toBe("31/01/2025");
    expect(formatDate("2025-01-31" as IsoDate, "en-US")).toBe("1/31/25");
  });

  it("never move a day, whatever the language", () => {
    expect(formatDate("2025-03-01" as IsoDate, "en-US")).toBe("3/1/25");
    const instant = new Date("2025-01-01T02:30:00Z");
    expect(formatInstantDate(instant, "America/Sao_Paulo", "en-US")).toBe("12/31/24");
  });
});
