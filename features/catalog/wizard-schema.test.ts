import { describe, expect, it } from "vitest";
import { readValidationMessage } from "@/lib/validation";
import { addressStep, dataStep, valueStep, wizardSchema } from "./wizard-schema";

const typed = {
  name: " Ana Souza ",
  cpf: "529.982.247-25",
  birth: "29/02/2024",
  cep: "01310-100",
  street: "Avenida Paulista",
  number: "1000",
  district: "Bela Vista",
  city: "São Paulo",
  state: "SP",
  amount: "1.234,56",
};

describe("wizard schema", () => {
  it("turns what was typed into what is stored: digits, an ISO date and cents", () => {
    expect(wizardSchema.parse(typed)).toMatchObject({
      name: "Ana Souza",
      cpf: "52998224725",
      birth: "2024-02-29",
      cep: "01310100",
      amount: 123_456,
    });
  });

  it("names the field and the catalog key of each mistake", () => {
    const result = dataStep.safeParse({ name: "Al", cpf: "111.111.111-11", birth: "31/02/2024" });
    expect(result.success).toBe(false);
    const keys = Object.fromEntries(
      (result.error?.issues ?? []).map((issue) => [
        String(issue.path[0]),
        readValidationMessage(issue.message).key,
      ]),
    );
    expect(keys).toEqual({ name: "tooShort", cpf: "invalid", birth: "invalidDate" });
  });

  it("checks each step alone, so a step can be validated before the next one exists", () => {
    expect(addressStep.safeParse({ ...typed }).success).toBe(true);
    expect(valueStep.safeParse({ amount: "0,00" }).success).toBe(false);
    expect(addressStep.safeParse({ ...typed, state: "SPP" }).success).toBe(false);
  });
});
