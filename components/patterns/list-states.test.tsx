// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { ListEmpty, SectionEmpty } from "./list-states";

// These are the base's own empty states; a product that draws its own keeps them out of the way.
vi.mock("./states.product", () => ({
  productListEmpty: null,
  productSectionEmpty: null,
  productNoResults: null,
}));

describe("an empty list", () => {
  it("says what is missing, what the list is for and the first step", () => {
    renderWithIntl(
      <ListEmpty
        title="Nenhum pedido ainda."
        body="Os pedidos que você registrar aparecem aqui."
        action={<a href="/new">Novo pedido</a>}
      />,
    );
    expect(screen.getByText("Nenhum pedido ainda.")).toBeTruthy();
    expect(screen.getByText("Os pedidos que você registrar aparecem aqui.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Novo pedido" })).toBeTruthy();
    expect(screen.queryByText("Exemplo")).toBeNull();
  });

  it("shows example rows that assistive technology skips", () => {
    const { container } = renderWithIntl(
      <ListEmpty
        title="Nenhum pedido ainda."
        preview={[
          { key: "a", title: "Ana Souza", details: ["12/10/2026", "R$ 120,00"] },
          { key: "b", title: "Bia Lima", details: ["11/10/2026", "R$ 80,00"] },
        ]}
      />,
    );
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden?.textContent).toContain("Exemplo");
    expect(hidden?.textContent).toContain("Ana Souza");
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("an empty section", () => {
  it("says what is not there yet and offers the step that fills it", () => {
    renderWithIntl(
      <SectionEmpty
        title="Nenhum pagamento registrado."
        action={<button type="button">Registrar</button>}
      />,
    );
    expect(screen.getByText("Nenhum pagamento registrado.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registrar" })).toBeTruthy();
  });
});
