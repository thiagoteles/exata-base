// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { pageWindow } from "@/lib/list-params";
import { renderWithIntl } from "@/tests/render";
import { ActiveFilters, ListNoResults, ListPagination } from "./list-controls";

function inUrl(searchParams: string, element: ReactNode) {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      {element}
    </NuqsTestingAdapter>,
  );
  return () => onUrlUpdate.mock.lastCall?.[0].queryString;
}

const filters = [
  { key: "status", name: "Situação", value: "Nova" },
  { key: "role", name: "Papel", value: "Equipe" },
];

describe("list controls", () => {
  it("removes one filter chip and goes back to the first page, leaving the other filter alone", async () => {
    const lastQuery = inUrl("?status=new&role=staff&page=3", <ActiveFilters filters={filters} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover filtro Situação: Nova" }));
    expect(lastQuery()).toBe("?role=staff");
  });

  it("shows no strip at all when no filter is active", () => {
    inUrl("", <ActiveFilters filters={[]} />);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("repeats the search and the filter count, and clears them all", async () => {
    const lastQuery = inUrl(
      "?q=joana&status=new&role=staff&page=2",
      <ListNoResults term="joana" filters={filters} />,
    );
    expect(screen.getByText("Nada para “joana” com 2 filtros")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(lastQuery()).toBe("");
  });

  it("says what was filtered when there is no search term", () => {
    inUrl("?status=new", <ListNoResults term="" filters={filters.slice(0, 1)} />);
    expect(screen.getByText("Nada com 1 filtro")).toBeTruthy();
  });

  it("walks the pages, writes the position in mono and drops page 1 from the address", async () => {
    const lastQuery = inUrl("?page=2", <ListPagination window={pageWindow(2, 312)} />);
    expect(screen.getByText("21 a 40 de 312")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(lastQuery()).toBe("?page=3");
    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(lastQuery()).toBe("");
  });

  it("disables the ends of the list", () => {
    inUrl("", <ListPagination window={pageWindow(1, 5)} />);
    expect((screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("button", { name: "Próxima" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
