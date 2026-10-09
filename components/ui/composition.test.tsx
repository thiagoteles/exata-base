// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Chip } from "./chip";
import { DatePicker } from "./date-picker";
import { Stepper } from "./stepper";

describe("Stepper", () => {
  it("marks the current step and says every state in words", () => {
    renderWithIntl(<Stepper label="Etapas" steps={["Dados", "Endereço", "Revisão"]} current={1} />);
    expect(screen.getByRole("list", { name: "Etapas" })).toBeTruthy();
    expect(screen.getByText("Endereço").closest("li")?.getAttribute("aria-current")).toBe("step");
    expect(screen.getByText("Dados").textContent).toContain("concluída");
    expect(screen.getByText("Endereço").textContent).toContain("etapa atual");
    expect(screen.getByText("Revisão").textContent).toContain("a fazer");
  });
});

describe("Chip", () => {
  it("names what goes, and removes by click, Delete or Backspace", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithIntl(<Chip label="Cobrança" removeLabel="Remover Cobrança" onRemove={onRemove} />);
    const button = screen.getByRole("button", { name: "Remover Cobrança" });
    await user.click(button);
    expect(onRemove).toHaveBeenCalledTimes(1);
    button.focus();
    await user.keyboard("{Delete}");
    await user.keyboard("{Backspace}");
    expect(onRemove).toHaveBeenCalledTimes(3);
  });

  it("is not a button itself: the words are text", () => {
    renderWithIntl(
      <Chip label="Cobrança" removeLabel="Remover Cobrança" onRemove={() => undefined} />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

function PickerHarness(props: { initial?: string; min?: string; max?: string }) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <>
      <DatePicker
        value={value}
        onValueChange={setValue}
        today="2026-10-09"
        {...(props.min === undefined ? {} : { min: props.min })}
        {...(props.max === undefined ? {} : { max: props.max })}
        aria-label="Vencimento"
      />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe("DatePicker", () => {
  it("takes a typed date and hands back an ISO date only when it is a real one", async () => {
    const user = userEvent.setup();
    renderWithIntl(<PickerHarness />);
    const input = screen.getByLabelText("Vencimento");
    await user.type(input, "31022026");
    expect(screen.getByTestId("value").textContent).toBe("");
    await user.clear(input);
    await user.type(input, "09102026");
    expect((input as HTMLInputElement).value).toBe("09/10/2026");
    expect(screen.getByTestId("value").textContent).toBe("2026-10-09");
  });

  it("refuses a typed date outside the range", async () => {
    const user = userEvent.setup();
    renderWithIntl(<PickerHarness min="2026-10-01" max="2026-10-31" />);
    await user.type(screen.getByLabelText("Vencimento"), "05112026");
    expect(screen.getByTestId("value").textContent).toBe("");
  });

  it("opens on the chosen day, moves by the keyboard, and chooses with Enter", async () => {
    const user = userEvent.setup();
    renderWithIntl(<PickerHarness initial="2026-10-09" />);
    await user.click(screen.getByRole("button", { name: "Abrir calendário" }));
    const day = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`);
    expect(document.activeElement).toBe(day("2026-10-09"));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(day("2026-10-10"));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(day("2026-10-17"));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(day("2026-10-11"));
    await user.keyboard("{PageDown}");
    expect(document.activeElement).toBe(day("2026-11-11"));
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("value").textContent).toBe("2026-11-11");
    expect((screen.getByLabelText("Vencimento") as HTMLInputElement).value).toBe("11/11/2026");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("opens on today when nothing is chosen, marks it, and cannot choose a day outside the range", async () => {
    const user = userEvent.setup();
    renderWithIntl(<PickerHarness min="2026-10-05" />);
    await user.click(screen.getByRole("button", { name: "Abrir calendário" }));
    expect(document.querySelector('[data-date="2026-10-09"]')?.getAttribute("aria-current")).toBe(
      "date",
    );
    expect(document.querySelector<HTMLButtonElement>('[data-date="2026-10-03"]')?.disabled).toBe(
      true,
    );
    await user.keyboard("{ArrowUp}{ArrowUp}");
    // The second step up would pass the minimum, so focus stops at the first allowed day.
    expect(document.activeElement).toBe(document.querySelector('[data-date="2026-10-05"]'));
  });
});
