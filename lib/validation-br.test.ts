import { describe, expect, it } from "vitest";
import { readValidationMessage } from "./validation";
import { cepSchema, cpfSchema, dateSchema, moneySchema, phoneSchema } from "./validation-br";

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
