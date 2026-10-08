// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Field, Input } from "./field";

const field = (props: { help?: string; error?: string }) => (
  <Field label="CPF" {...props}>
    {(control) => <Input {...control} />}
  </Field>
);

describe("Field", () => {
  it("names the control by its label and describes it with the help text", () => {
    renderWithIntl(field({ help: "Só números" }));
    const input = screen.getByLabelText("CPF");
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByText("Só números").id);
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("shows an error instead of the help, never both, and marks the control invalid", () => {
    renderWithIntl(field({ help: "Só números", error: "CPF inválido" }));
    expect(screen.queryByText("Só números")).toBeNull();
    const input = screen.getByLabelText("CPF");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByText("CPF inválido").id);
  });
});
