// @vitest-environment happy-dom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { type Column, DataList } from "./data-list";
import { ListEmpty } from "./list-states";

type Row = { id: string; name: string; amount: string };

const columns: Column<Row>[] = [
  { key: "name", header: "Nome", kind: "title", cell: (row) => row.name },
  { key: "amount", header: "Valor", numeric: true, cell: (row) => row.amount },
];

describe("DataList", () => {
  it("is a table with its column headers and one row per record", () => {
    renderWithIntl(
      <DataList
        label="Pedidos"
        columns={columns}
        rows={[
          { id: "1", name: "Ana", amount: "R$ 10,00" },
          { id: "2", name: "Bia", amount: "R$ 20,00" },
        ]}
        getKey={(row) => row.id}
      />,
    );
    const table = screen.getByRole("table", { name: "Pedidos" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Nome", "Valor"]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("puts numbers in mono", () => {
    renderWithIntl(
      <DataList
        label="Pedidos"
        columns={columns}
        rows={[{ id: "1", name: "Ana", amount: "R$ 10,00" }]}
        getKey={(row) => row.id}
      />,
    );
    expect(screen.getByText("R$ 10,00").className).toContain("font-mono");
  });

  it("shows the empty state as one row, in the same table", () => {
    renderWithIntl(
      <DataList
        label="Pedidos"
        columns={columns}
        rows={[]}
        getKey={(row) => row.id}
        emptyState={<ListEmpty title="Ainda não há pedidos." />}
      />,
    );
    expect(within(screen.getByRole("table")).getByText("Ainda não há pedidos.")).toBeTruthy();
  });
});
