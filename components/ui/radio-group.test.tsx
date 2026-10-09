// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { RadioGroup } from "./radio-group";

const options = [
  { value: "mensal", label: "Mensal", description: "Cobrado todo mês" },
  { value: "anual", label: "Anual" },
  { value: "vitalicio", label: "Vitalício", disabled: true },
];

function Harness() {
  const [value, setValue] = useState("mensal");
  return <RadioGroup legend="Cobrança" value={value} onValueChange={setValue} options={options} />;
}

describe("RadioGroup", () => {
  it("names the group, and each choice by its words", () => {
    renderWithIntl(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Cobrança" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Mensal/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Anual" }).getAttribute("aria-checked")).toBe("false");
  });

  it("is one stop for Tab, and the arrow keys move between the choices, skipping a disabled one", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.tab();
    const monthly = screen.getByRole("radio", { name: /Mensal/ });
    const yearly = screen.getByRole("radio", { name: "Anual" });
    expect(document.activeElement).toBe(monthly);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(yearly);
    // The disabled choice is passed over, and the list wraps to the first.
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(monthly);
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(yearly);
    await user.keyboard(" ");
    expect(yearly.getAttribute("aria-checked")).toBe("true");
  });

  it("chooses when the words are clicked", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(screen.getByText("Anual"));
    expect(screen.getByRole("radio", { name: "Anual" }).getAttribute("aria-checked")).toBe("true");
  });
});
