import { describe, expect, it } from "vitest";
import { chooseLocale } from "./locale";

describe("the language of an e-mail", () => {
  it("prefers what the recipient saved, then what they were using", () => {
    expect(chooseLocale("pt-BR", "pt-BR")).toBe("pt-BR");
    expect(chooseLocale(undefined, "pt-BR")).toBe("pt-BR");
    expect(chooseLocale(null, "pt-BR")).toBe("pt-BR");
  });

  it("ignores a saved language that is not on the list", () => {
    expect(chooseLocale("xx-XX", "pt-BR")).toBe("pt-BR");
  });
});
