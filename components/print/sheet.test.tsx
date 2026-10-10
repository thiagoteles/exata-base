// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { NoBreak, PrintTable, Sheet, SheetHeader } from "./sheet";

describe("a printed sheet", () => {
  it("names the brand, the title and the date in its header", () => {
    renderWithIntl(
      <Sheet>
        <SheetHeader brand="Produto" title="Ficha" date="09/10/2026" />
      </Sheet>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Ficha" })).toBeTruthy();
    expect(screen.getByText("Produto")).toBeTruthy();
    expect(screen.getByText("09/10/2026")).toBeTruthy();
  });

  it("keeps a block whole, and the table head and rows in the form the printer repeats and never cuts", () => {
    const { container } = renderWithIntl(
      <NoBreak>
        <PrintTable
          caption="Entregas"
          head={["Dia", "Item"]}
          rows={[
            ["Seg", "Cesta"],
            ["Ter", "Roupa"],
          ]}
        />
      </NoBreak>,
    );
    expect(container.querySelector(".break-inside-avoid")).not.toBeNull();
    expect(screen.getByRole("table", { name: "Entregas" })).toBeTruthy();
    expect(container.querySelector("thead.table-header-group")).not.toBeNull();
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Dia",
      "Item",
    ]);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.className).toContain("break-inside-avoid");
    }
  });
});
