import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { digitsOf, maskCep, maskCpf, maskDate, maskMoney, maskPhone } from "./masks";
import { parseBRL } from "./money";

const digits = fc.stringMatching(/^\d{0,20}$/);
const typing = fc.string({ maxLength: 30 });

describe("masks", () => {
  it("write the usual shapes", () => {
    expect(maskCpf("52998224725")).toBe("529.982.247-25");
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
    expect(maskPhone("1133334444")).toBe("(11) 3333-4444");
    expect(maskCep("01310100")).toBe("01310-100");
    expect(maskDate("29022024")).toBe("29/02/2024");
    expect(maskMoney("123456")).toBe("1.234,56");
  });

  it("never lose or invent a digit: the digits come back, cut at the field's size", () => {
    fc.assert(
      fc.property(digits, (input) => {
        expect(digitsOf(maskCpf(input))).toBe(input.slice(0, 11));
        expect(digitsOf(maskPhone(input))).toBe(input.slice(0, 11));
        expect(digitsOf(maskCep(input))).toBe(input.slice(0, 8));
        expect(digitsOf(maskDate(input))).toBe(input.slice(0, 8));
      }),
    );
  });

  it("are stable: masking a masked value changes nothing, whatever was typed", () => {
    fc.assert(
      fc.property(typing, (input) => {
        for (const mask of [maskCpf, maskPhone, maskCep, maskDate, maskMoney]) {
          expect(mask(mask(input))).toBe(mask(input));
        }
      }),
    );
  });

  it("keep a half-typed value readable, without a trailing separator", () => {
    expect(maskCpf("5299")).toBe("529.9");
    expect(maskDate("2902")).toBe("29/02");
    expect(maskCep("0131")).toBe("0131");
    expect(maskCep("")).toBe("");
  });
});

describe("money mask", () => {
  it("reads typed digits as cents, and what it writes parses back to the same cents", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999_999_999_999 }), (cents) => {
        expect(parseBRL(maskMoney(String(cents)))).toBe(cents);
      }),
    );
  });

  it("ignores leading zeros and anything that is not a digit", () => {
    expect(maskMoney("0")).toBe("");
    expect(maskMoney("000012")).toBe("0,12");
    expect(maskMoney("R$ 1,5x")).toBe("0,15");
  });
});
