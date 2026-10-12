// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trialStanding } from "@/domain/billing/trial";
import { renderWithIntl } from "@/tests/render";
import { Achievements } from "./achievements";
import { Checklist } from "./checklist";
import { Gate } from "./gate";
import { Paywall } from "./paywall";
import { TrialNotice } from "./trial-notice";

const tracked = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track: tracked }));

const closed = {
  title: "Só no plano pago",
  body: "Veja o que abre.",
  benefits: ["Relatórios", "Exportação"],
};

beforeEach(() => tracked.mockClear());

describe("Paywall and Gate", () => {
  it("says what is closed, what the plan opens, and gives the way forward", () => {
    renderWithIntl(
      <Paywall
        source="catalog"
        label="Plano pago"
        {...closed}
        action={<a href="/planos">Ver planos</a>}
      />,
    );
    expect(screen.getByRole("region", { name: "Plano pago" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Só no plano pago" })).toBeTruthy();
    expect(screen.getByText("Relatórios")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver planos" })).toBeTruthy();
  });

  it("counts a view once for where it was seen, and again for another place", () => {
    const { rerender } = renderWithIntl(
      <Paywall source="catalog" label="x" {...closed} action={null} />,
    );
    expect(tracked).toHaveBeenCalledTimes(1);
    expect(tracked).toHaveBeenCalledWith("paywall_viewed", { source: "catalog" });
    rerender(<Paywall source="catalog" label="x" {...closed} action={null} />);
    expect(tracked).toHaveBeenCalledTimes(1);
    rerender(<Paywall source="reports" label="x" {...closed} action={null} />);
    expect(tracked).toHaveBeenCalledTimes(2);
  });

  it("shows the content and sends no event when the plan opens it", () => {
    renderWithIntl(
      <Gate open source="catalog" label="x" closed={closed} action={null}>
        <p>Conteúdo pago</p>
      </Gate>,
    );
    expect(screen.getByText("Conteúdo pago")).toBeTruthy();
    expect(tracked).not.toHaveBeenCalled();
  });

  it("shows the paywall and not the content when it is shut", () => {
    renderWithIntl(
      <Gate open={false} source="catalog" label="x" closed={closed} action={null}>
        <p>Conteúdo pago</p>
      </Gate>,
    );
    expect(screen.queryByText("Conteúdo pago")).toBeNull();
    expect(screen.getByRole("heading", { name: "Só no plano pago" })).toBeTruthy();
  });
});

describe("TrialNotice", () => {
  const endsAt = new Date("2026-10-20T12:00:00Z");
  it("fills the bar with the days used and says the rest in words", () => {
    const standing = trialStanding({
      endsAt,
      totalDays: 14,
      now: new Date("2026-10-15T12:00:00Z"),
    });
    renderWithIntl(
      <TrialNotice
        standing={standing}
        title="Teste gratuito"
        summary="Faltam 5 dias"
        barLabel="Dias usados"
      />,
    );
    expect(screen.getByText("Faltam 5 dias")).toBeTruthy();
    const bar = screen.getByRole("progressbar", { name: "Dias usados" });
    expect(bar.getAttribute("aria-valuenow")).toBe("9");
    expect(bar.getAttribute("aria-valuemax")).toBe("14");
  });
});

describe("Checklist", () => {
  const steps = [
    { id: "a", title: "Primeiro", help: "Ajuda do primeiro", done: true },
    { id: "b", title: "Segundo", help: "Ajuda do segundo", done: false },
    { id: "c", title: "Terceiro", help: "Ajuda do terceiro", done: false },
  ];
  it("names only the open step in full, with its action, and says which are done", () => {
    renderWithIntl(
      <Checklist
        progressLabel="Progresso"
        countText="1 de 3"
        doneText="(feito)"
        steps={steps}
        nextId="b"
        action={(id) => <button type="button">Fazer {id}</button>}
      />,
    );
    expect(screen.getByText("Ajuda do segundo")).toBeTruthy();
    expect(screen.queryByText("Ajuda do terceiro")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("Primeiro").textContent).toContain("(feito)");
    expect(
      screen.getByRole("progressbar", { name: "Progresso" }).getAttribute("aria-valuenow"),
    ).toBe("1");
  });
});

describe("Achievements", () => {
  it("stamps what is earned, locks what is not, and shows a count only for what is still ahead", () => {
    renderWithIntl(
      <Achievements
        earnedText="Conquistada"
        lockedText="A conquistar"
        items={[
          {
            id: "a",
            title: "Primeira ficha",
            description: "Cadastre uma ficha",
            earned: true,
            progress: { value: 1, max: 1, label: "Fichas" },
          },
          {
            id: "b",
            title: "Dez fichas",
            description: "Cadastre dez fichas",
            earned: false,
            progress: { value: 4, max: 10, label: "Fichas cadastradas" },
          },
        ]}
      />,
    );
    expect(screen.getByText("Conquistada")).toBeTruthy();
    expect(screen.getByText("A conquistar")).toBeTruthy();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    expect(
      screen.getByRole("progressbar", { name: "Fichas cadastradas" }).getAttribute("aria-valuenow"),
    ).toBe("4");
  });
});
