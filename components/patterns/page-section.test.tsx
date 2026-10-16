// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { PageSection } from "./page-section";

describe("PageSection", () => {
  it("is a region named by its title, which takes the section role, with its help and actions", () => {
    renderWithIntl(
      <PageSection
        title="Pagamentos"
        help="O que já chegou."
        actions={<button type="button">Novo</button>}
      >
        <p>conteúdo</p>
      </PageSection>,
    );
    const region = screen.getByRole("region", { name: "Pagamentos" });
    const title = screen.getByRole("heading", { level: 2, name: "Pagamentos" });
    expect(region.contains(title)).toBe(true);
    expect(title.classList.contains("text-section")).toBe(true);
    expect(screen.getByText("O que já chegou.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Novo" })).toBeTruthy();
  });
});
