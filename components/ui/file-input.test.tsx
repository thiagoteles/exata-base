// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Field } from "./field";
import { FileInput } from "./file-input";

function Harness({ onChange }: { onChange?: () => void }) {
  return (
    <form>
      <Field label="Extrato">
        {(control) => <FileInput {...control} name="file" onChange={onChange} />}
      </Field>
      <button type="reset">Limpar</button>
    </form>
  );
}

const statement = () => new File(["x".repeat(2048)], "extrato.pdf", { type: "application/pdf" });

describe("FileInput", () => {
  it("is a file field named by its label, inviting a choice while empty", () => {
    renderWithIntl(<Harness />);
    expect(screen.getByLabelText("Extrato")).toHaveProperty("type", "file");
    expect(screen.getByText("Escolher arquivo")).toBeTruthy();
  });

  it("names the chosen file and its size, and passes the change on", async () => {
    const onChange = vi.fn();
    renderWithIntl(<Harness onChange={onChange} />);
    await userEvent.upload(screen.getByLabelText("Extrato"), statement());
    expect(screen.getByText("extrato.pdf")).toBeTruthy();
    expect(screen.getByText("2 KB")).toBeTruthy();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("goes back to empty when the file is taken out or the form is reset", async () => {
    renderWithIntl(<Harness />);
    const input = screen.getByLabelText<HTMLInputElement>("Extrato");
    await userEvent.upload(input, statement());
    await userEvent.click(screen.getByRole("button", { name: "Tirar" }));
    expect(screen.queryByText("extrato.pdf")).toBeNull();
    expect(input.value).toBe("");
    await userEvent.upload(input, statement());
    await userEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.queryByText("extrato.pdf")).toBeNull();
  });
});
