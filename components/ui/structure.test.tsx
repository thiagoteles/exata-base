// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Accordion } from "./accordion";
import { Breadcrumb } from "./breadcrumb";
import { Tabs } from "./tabs";

const tabs = [
  { value: "geral", label: "Geral", content: <p>Painel geral</p> },
  { value: "cobranca", label: "Cobrança", content: <p>Painel de cobrança</p> },
  { value: "bloqueada", label: "Bloqueada", content: <p>Nunca</p>, disabled: true },
  { value: "avancado", label: "Avançado", content: <p>Painel avançado</p> },
];

function TabsHarness() {
  const [value, setValue] = useState("geral");
  return <Tabs label="Conta" value={value} onValueChange={setValue} tabs={tabs} />;
}

describe("Tabs", () => {
  it("names the set and shows only the chosen panel", () => {
    renderWithIntl(<TabsHarness />);
    expect(screen.getByRole("tablist", { name: "Conta" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Geral" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Painel geral")).toBeTruthy();
    expect(screen.queryByText("Painel de cobrança")).toBeNull();
  });

  it("is one stop for Tab, and the arrows move and choose, passing over a disabled tab", async () => {
    const user = userEvent.setup();
    renderWithIntl(<TabsHarness />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Geral" }));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Cobrança" }));
    expect(screen.getByText("Painel de cobrança")).toBeTruthy();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Avançado" }));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Geral" }));
  });

  it("chooses a tab on click", async () => {
    const user = userEvent.setup();
    renderWithIntl(<TabsHarness />);
    await user.click(screen.getByRole("tab", { name: "Avançado" }));
    expect(screen.getByText("Painel avançado")).toBeTruthy();
  });
});

const items = [
  { value: "a", title: "Como cancelo?", content: <p>Na página do plano.</p> },
  { value: "b", title: "Posso trocar de plano?", content: <p>Sim, a qualquer hora.</p> },
];

describe("Accordion", () => {
  it("opens and closes a row with Enter and Space, and says so to a screen reader", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Accordion items={items} />);
    const first = screen.getByRole("button", { name: "Como cancelo?" });
    expect(first.getAttribute("aria-expanded")).toBe("false");
    await user.tab();
    await user.keyboard("{Enter}");
    expect(first.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard(" ");
    expect(first.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps one open at a time in single mode, and several in multiple mode", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithIntl(<Accordion items={items} />);
    await user.click(screen.getByRole("button", { name: "Como cancelo?" }));
    await user.click(screen.getByRole("button", { name: "Posso trocar de plano?" }));
    expect(
      screen.getByRole("button", { name: "Como cancelo?" }).getAttribute("aria-expanded"),
    ).toBe("false");
    unmount();
    renderWithIntl(<Accordion items={items} type="multiple" />);
    await user.click(screen.getByRole("button", { name: "Como cancelo?" }));
    await user.click(screen.getByRole("button", { name: "Posso trocar de plano?" }));
    expect(
      screen.getByRole("button", { name: "Como cancelo?" }).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("moves between titles with the arrow keys and starts open where asked", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Accordion items={items} defaultOpen={["b"]} />);
    expect(
      screen.getByRole("button", { name: "Posso trocar de plano?" }).getAttribute("aria-expanded"),
    ).toBe("true");
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Posso trocar de plano?" }),
    );
  });

  it("holds closed content out of the page until its title is opened", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Accordion items={items} />);
    expect(screen.queryByText("Na página do plano.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Como cancelo?" }));
    expect(screen.getByText("Na página do plano.")).toBeTruthy();
  });
});

describe("Breadcrumb", () => {
  it("links every step but the last, which is the current page", () => {
    renderWithIntl(
      <Breadcrumb
        label="Você está aqui"
        items={[
          { label: "Início", href: "/" },
          { label: "Artigos", href: "/articles" },
          { label: "Como começar" },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Você está aqui" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Início" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Artigos" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Como começar" })).toBeNull();
    expect(screen.getByText("Como começar").getAttribute("aria-current")).toBe("page");
  });
});
