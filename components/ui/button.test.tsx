// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Button } from "./button";

describe("Button", () => {
  it("runs its action when clicked", async () => {
    const onClick = vi.fn();
    renderWithIntl(<Button onClick={onClick}>Salvar</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("ignores clicks while loading, keeps its label, and says it is busy", async () => {
    const onClick = vi.fn();
    renderWithIntl(
      <Button loading={true} onClick={onClick}>
        Salvar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Salvar" });
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("does not submit a form while loading", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    renderWithIntl(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading={true}>
          Enviar
        </Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
