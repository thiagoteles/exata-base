// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Combobox } from "./combobox";

const options = [
  { value: "ma", label: "Maranhão" },
  { value: "mt", label: "Mato Grosso" },
  { value: "pa", label: "Pará" },
];

function Harness() {
  const [value, setValue] = useState("");
  return <Combobox options={options} value={value} onValueChange={setValue} placeholder="Estado" />;
}

describe("Combobox", () => {
  it("filters while typing, ignoring accents and case, and picks with the keyboard", async () => {
    renderWithIntl(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Estado" }));
    const search = screen.getByRole("combobox");
    await userEvent.type(search, "MARANHAO");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Maranhão"]);
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Maranhão" })).toBeTruthy();
  });

  it("moves through the list with the arrow keys and announces the highlighted option", async () => {
    renderWithIntl(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Estado" }));
    const search = screen.getByRole("combobox");
    const options_ = screen.getAllByRole("option");
    expect(search.getAttribute("aria-activedescendant")).toBe(options_[0]?.id);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(search.getAttribute("aria-activedescendant")).toBe(options_[2]?.id);
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Pará" })).toBeTruthy();
  });

  it("says so when nothing matches", async () => {
    renderWithIntl(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Estado" }));
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(screen.getByText("Nenhuma opção encontrada.")).toBeTruthy();
  });
});
