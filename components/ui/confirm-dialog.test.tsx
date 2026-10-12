// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Button } from "./button";
import { ConfirmDialog } from "./confirm-dialog";

function setup(onConfirm = vi.fn()) {
  renderWithIntl(
    <ConfirmDialog
      trigger={<Button tone="danger">Excluir</Button>}
      title="Excluir 3 pedidos?"
      consequence="Os 3 pedidos serão apagados e não voltam."
      confirmLabel="Excluir 3 pedidos"
      cancelLabel="Cancelar"
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
}

describe("ConfirmDialog", () => {
  it("asks first, naming the consequence, and does nothing until confirmed", async () => {
    const onConfirm = setup();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(screen.getByRole("alertdialog", { name: "Excluir 3 pedidos?" })).toBeTruthy();
    expect(screen.getByText("Os 3 pedidos serão apagados e não voltam.")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Excluir 3 pedidos" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("cancels without running the action", async () => {
    const onConfirm = setup();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("closes with Escape without running the action", async () => {
    const onConfirm = setup();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.keyboard("{Escape}");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
