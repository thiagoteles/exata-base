// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Checkbox } from "./checkbox";

function Harness({ initial = false as boolean | "indeterminate" }) {
  const [checked, setChecked] = useState(initial);
  return (
    <Checkbox
      label="Aceito os termos"
      description="Leia antes"
      checked={checked}
      onCheckedChange={setChecked}
    />
  );
}

describe("Checkbox", () => {
  it("is named by its label, described by nothing it hides, and toggles with Space", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    const box = screen.getByRole("checkbox", { name: /Aceito os termos/ });
    expect(box.getAttribute("aria-checked")).toBe("false");
    await user.tab();
    expect(document.activeElement).toBe(box);
    await user.keyboard(" ");
    expect(box.getAttribute("aria-checked")).toBe("true");
    await user.keyboard(" ");
    expect(box.getAttribute("aria-checked")).toBe("false");
  });

  it("toggles when the words are clicked", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(screen.getByText("Aceito os termos"));
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
  });

  it("says mixed for a partial selection and a click makes it chosen", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness initial="indeterminate" />);
    const box = screen.getByRole("checkbox");
    expect(box.getAttribute("aria-checked")).toBe("mixed");
    await user.click(box);
    expect(box.getAttribute("aria-checked")).toBe("true");
  });

  it("ignores a disabled box", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <Checkbox
        label="Bloqueado"
        checked={false}
        onCheckedChange={() => {
          throw new Error("changed");
        }}
        disabled
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
  });
});
