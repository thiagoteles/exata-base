import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { maskCnpj } from "./masks";
import { readValidationMessage, z } from "./validation";
import {
  cepSchema,
  cnpjSchema,
  cpfSchema,
  dateSchema,
  moneySchema,
  optional,
  phoneSchema,
} from "./validation-br";

const keyOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : readValidationMessage(result.error?.issues[0]?.message ?? "").key;

describe("Brazilian data is checked, not just shaped", () => {
  it("accepts a real CPF in any form and returns its digits", () => {
    expect(cpfSchema.parse("529.982.247-25")).toBe("52998224725");
    expect(cpfSchema.parse("52998224725")).toBe("52998224725");
  });

  it("refuses a CPF that has the right shape and a wrong check digit, or repeated digits", () => {
    expect(keyOf(cpfSchema.safeParse("529.982.247-26"))).toBe("invalid");
    expect(keyOf(cpfSchema.safeParse("111.111.111-11"))).toBe("invalid");
  });

  it("checks phone and CEP", () => {
    expect(phoneSchema.parse("(11) 98765-4321")).toBe("11987654321");
    expect(keyOf(phoneSchema.safeParse("(11) 12345-678"))).toBe("invalid");
    expect(cepSchema.parse("01310-100")).toBe("01310100");
    expect(keyOf(cepSchema.safeParse("0131"))).toBe("invalid");
  });

  it("turns dd/mm/aaaa into an ISO date, and refuses 31/02", () => {
    expect(dateSchema.parse("29/02/2024")).toBe("2024-02-29");
    expect(keyOf(dateSchema.safeParse("31/02/2024"))).toBe("invalidDate");
  });

  it("turns a typed amount into cents, and refuses zero and nonsense", () => {
    expect(moneySchema.parse("1.234,56")).toBe(123_456);
    expect(keyOf(moneySchema.safeParse("0,00"))).toBe("invalidMoney");
    expect(keyOf(moneySchema.safeParse("abc"))).toBe("invalidMoney");
  });
});

/** The check digits of a CNPJ by the published rule: each character is its code minus 48, mod 11. */
function withCheckDigits(base: string): string {
  const value = (character: string) => character.charCodeAt(0) - 48;
  const digit = (characters: string, weights: readonly number[]) => {
    const sum = [...characters].reduce(
      (total, character, index) => total + value(character) * (weights[index] ?? 0),
      0,
    );
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(`${base}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base}${first}${second}`;
}

const cnpjBase = fc.stringMatching(/^[0-9A-Z]{12}$/).filter((base) => !/^(.)\1+$/.test(base));

describe("a CNPJ, numeric or with letters", () => {
  it("accepts the numeric form with or without the mask", () => {
    expect(cnpjSchema.parse("11.222.333/0001-81")).toBe("11222333000181");
    expect(cnpjSchema.parse("11222333000181")).toBe("11222333000181");
  });

  it("accepts the official alphanumeric example in capitals", () => {
    expect(cnpjSchema.parse("12.ABC.345/01DE-35")).toBe("12ABC34501DE35");
    expect(cnpjSchema.parse("12abc34501de35")).toBe("12ABC34501DE35");
  });

  it("refuses a wrong check digit, a short value and repeated characters", () => {
    expect(keyOf(cnpjSchema.safeParse("11.222.333/0001-82"))).toBe("invalid");
    expect(keyOf(cnpjSchema.safeParse("12.ABC.345/01DE-36"))).toBe("invalid");
    expect(keyOf(cnpjSchema.safeParse("1122233300018"))).toBe("invalid");
    expect(keyOf(cnpjSchema.safeParse("00.000.000/0000-00"))).toBe("invalid");
  });

  it("accepts any base with the check digits the rule computes, however it is typed", () => {
    fc.assert(
      fc.property(cnpjBase, (base) => {
        const cnpj = withCheckDigits(base);
        expect(cnpjSchema.parse(cnpj)).toBe(cnpj);
        expect(cnpjSchema.parse(maskCnpj(cnpj))).toBe(cnpj);
      }),
    );
  });

  it("refuses the same base when a check digit is changed", () => {
    fc.assert(
      fc.property(cnpjBase, fc.integer({ min: 1, max: 9 }), (base, shift) => {
        const cnpj = withCheckDigits(base);
        const changed = `${cnpj.slice(0, 13)}${(Number(cnpj.slice(13)) + shift) % 10}`;
        expect(cnpjSchema.safeParse(changed).success).toBe(false);
      }),
    );
  });
});

describe("an optional field", () => {
  const cpf = optional(cpfSchema);

  it("turns blank into null and keeps checking what was typed", () => {
    expect(cpf.parse("")).toBeNull();
    expect(cpf.parse("   ")).toBeNull();
    expect(cpf.parse("529.982.247-25")).toBe("52998224725");
    expect(cpf.safeParse("111.111.111-11").success).toBe(false);
  });

  it("works with any schema, not only the Brazilian ones", () => {
    expect(optional(z.email()).parse(" ana@example.com ")).toBe("ana@example.com");
    expect(optional(dateSchema).parse("15/03/1985")).toBe("1985-03-15");
  });
});
