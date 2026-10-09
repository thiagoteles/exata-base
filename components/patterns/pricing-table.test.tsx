// @vitest-environment happy-dom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { PricingTable } from "./pricing-table";

const columns = [
  { id: "free", name: "Gratuito", price: "Grátis", unit: "sem prazo", has: [true, false] },
  {
    id: "yearly",
    name: "Anual",
    price: "R$ 199,00",
    unit: "por ano",
    highlighted: true,
    has: [true, true],
    action: <button type="button">Assinar</button>,
  },
];

function table() {
  return renderWithIntl(
    <PricingTable
      caption="Planos"
      featuresLabel="O que está incluso"
      includedLabel="Incluído"
      excludedLabel="Não incluído"
      features={["Relatórios", "Suporte"]}
      columns={columns}
    />,
  );
}

describe("PricingTable", () => {
  it("is a table named by its caption, with a column per plan and a row per feature", () => {
    table();
    expect(screen.getByRole("table", { name: "Planos" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "Relatórios",
      "Suporte",
    ]);
  });

  it("says in words whether each plan has each feature, so the mark is never alone", () => {
    table();
    const rows = screen.getAllByRole("row");
    const support = within(rows[2] as HTMLElement).getAllByRole("cell");
    expect(support.map((cell) => cell.textContent)).toEqual(["Não incluído", "Incluído"]);
  });

  it("shows each price and unit, and the action only where there is one", () => {
    table();
    expect(screen.getByText("R$ 199,00")).toBeTruthy();
    expect(screen.getByText("por ano")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Assinar" })).toHaveLength(1);
  });
});
