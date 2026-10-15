// @vitest-environment happy-dom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { ClosingBand } from "./closing-band";
import { ProofStrip } from "./proof-strip";
import { Showcase } from "./showcase";
import { Voices } from "./voices";

describe("the public site's patterns", () => {
  it("lists the claims in order, numbered only for the eye", () => {
    renderWithIntl(
      <ProofStrip
        label="Garantias"
        items={[
          { id: "a", title: "Dados no Brasil" },
          { id: "b", title: "Cancele quando quiser", body: "Sem multa." },
        ]}
      />,
    );
    const list = within(screen.getByRole("region", { name: "Garantias" })).getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.querySelector("p")?.textContent)).toEqual([
      "Dados no Brasil",
      "Cancele quando quiser",
    ]);
    expect(
      within(items[0] as HTMLElement)
        .getByText("01")
        .getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("shows one thing the product does beside its proof, which arrives as it scrolls", () => {
    const { container } = renderWithIntl(
      <Showcase
        anchor="demo"
        marker="02"
        title="Feche o mês"
        body={["Tudo numa tela."]}
        points={["Totais por moeda"]}
        actions={<a href="/sign-up">Começar</a>}
        proof={<p>Prova real</p>}
        mirror
        stickyText
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Feche o mês" })).toBeTruthy();
    expect(screen.getByRole("listitem").textContent).toBe("Totais por moeda");
    expect(screen.getByRole("link", { name: "Começar" })).toBeTruthy();
    expect(screen.getByText("Prova real").parentElement?.classList.contains("reveal")).toBe(true);
    expect(container.querySelector("section")?.id).toBe("demo");
  });

  it("gives each audience's words as a quote with the product's answer under it", () => {
    renderWithIntl(
      <Voices
        label="Para quem é"
        items={[
          { id: "start", quote: "Nunca fiz isso.", answer: "Comece pelo básico." },
          {
            id: "back",
            quote: "Parei há anos.",
            answer: "Volte de onde parou.",
            action: <a href="/teste">Fazer o teste</a>,
          },
        ]}
      />,
    );
    const items = within(screen.getByRole("list", { name: "Para quem é" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.querySelector("blockquote")?.textContent).toBe("Nunca fiz isso.");
    expect(
      within(items[1] as HTMLElement).getByRole("link", { name: "Fazer o teste" }),
    ).toBeTruthy();
  });

  it("ends the page on the promise and the same action", () => {
    renderWithIntl(
      <ClosingBand
        title="Comece hoje"
        body="Leva um minuto."
        actions={<a href="/sign-up">Criar conta</a>}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Comece hoje" })).toBeTruthy();
    expect(screen.getByText("Leva um minuto.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Criar conta" })).toBeTruthy();
  });
});
