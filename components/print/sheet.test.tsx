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

  it("keeps the page's margin unless asked for the panel's inset", () => {
    const { container, rerender } = renderWithIntl(<Sheet>texto</Sheet>);
    const sheet = () => container.querySelector("article");
    expect(sheet()?.classList.contains("p-sheet-margin")).toBe(true);
    rerender(<Sheet inset="compact">texto</Sheet>);
    expect(sheet()?.classList.contains("p-panel-inset")).toBe(true);
    expect(sheet()?.classList.contains("p-sheet-margin")).toBe(false);
  });

  it("takes the level its title has in the page that shows it", () => {
    renderWithIntl(<SheetHeader brand="Produto" title="Recibo" date="14/10/2026" level={3} />);
    expect(screen.getByRole("heading", { level: 3, name: "Recibo" })).toBeTruthy();
  });

  it("is set in the text face and the page's palette unless asked for the document face and paper", () => {
    const { container, rerender } = renderWithIntl(<Sheet>texto</Sheet>);
    const sheet = () => container.querySelector("article");
    expect(sheet()?.classList.contains("font-document")).toBe(false);
    expect(sheet()?.hasAttribute("data-paper")).toBe(false);
    rerender(
      <Sheet face="document" paper>
        texto
      </Sheet>,
    );
    expect(sheet()?.classList.contains("font-document")).toBe(true);
    expect(sheet()?.hasAttribute("data-paper")).toBe(true);
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
