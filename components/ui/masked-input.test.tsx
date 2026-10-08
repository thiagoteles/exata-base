// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { maskCpf, maskMoney } from "@/lib/masks";
import { renderWithIntl } from "@/tests/render";
import { MaskedInput } from "./masked-input";

function Harness({ mask, prefix }: { mask: (value: string) => string; prefix?: string }) {
  const [value, setValue] = useState("");
  return (
    <>
      <MaskedInput
        aria-label="campo"
        mask={mask}
        value={value}
        onValueChange={setValue}
        {...(prefix === undefined ? {} : { prefix })}
      />
      <output data-testid="raw">{value}</output>
    </>
  );
}

describe("MaskedInput", () => {
  it("formats while the person types and reports the masked value", async () => {
    renderWithIntl(<Harness mask={maskCpf} />);
    await userEvent.type(screen.getByLabelText("campo"), "52998224725");
    expect((screen.getByLabelText("campo") as HTMLInputElement).value).toBe("529.982.247-25");
    expect(screen.getByTestId("raw").textContent).toBe("529.982.247-25");
  });

  it("drops what is not a digit and stops at the size of the field", async () => {
    renderWithIntl(<Harness mask={maskCpf} />);
    await userEvent.type(screen.getByLabelText("campo"), "a5b2c9d9e8f2g2h4i7j2k5l999");
    expect((screen.getByLabelText("campo") as HTMLInputElement).value).toBe("529.982.247-25");
  });

  it("types money from the right, like a payment terminal", async () => {
    renderWithIntl(<Harness mask={maskMoney} prefix="R$" />);
    await userEvent.type(screen.getByLabelText("campo"), "123456");
    expect((screen.getByLabelText("campo") as HTMLInputElement).value).toBe("1.234,56");
    expect(screen.getByText("R$")).toBeTruthy();
  });
});
