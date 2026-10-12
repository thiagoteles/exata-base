// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Button } from "./button";
import { Panel } from "./panel";
import { Spinner } from "./spinner";
import { buttonClasses } from "./styles";

const words = (classes: string) => new Set(classes.split(/\s+/).filter(Boolean));

describe("tone and size, the same words everywhere", () => {
  // The classes the three buttons carried before they took a tone and a size. The look must not move.
  const shared = [
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "rounded-control",
    "font-semibold",
    "h-control",
    "px-4.5",
    "text-button",
    "pointer-coarse:h-control-coarse",
    "transition-[filter,border-color]",
    "duration-120",
    "ease-enter",
    "active:translate-y-px",
    "focus-visible:outline-2",
    "focus-visible:outline-offset-2",
    "focus-visible:outline-focus",
    "disabled:cursor-default",
    "disabled:opacity-50",
  ];

  it("keeps the old primary, secondary and danger buttons exactly as they were", () => {
    expect(words(buttonClasses("primary"))).toEqual(
      new Set([...shared, "bg-action", "text-on-action", "hover:brightness-110"]),
    );
    expect(words(buttonClasses("secondary"))).toEqual(
      new Set([
        ...shared,
        "border-2",
        "border-line-strong",
        "bg-surface",
        "text-ink",
        "hover:border-ink",
      ]),
    );
    expect(words(buttonClasses("primary", { tone: "danger" }))).toEqual(
      new Set([...shared, "bg-danger", "text-on-action", "hover:brightness-110"]),
    );
  });

  it("gives a button a danger tone on either hierarchy, and a smaller size", () => {
    expect(buttonClasses("secondary", { tone: "danger" })).toContain("text-danger-ink");
    expect(buttonClasses("primary", { size: "sm" })).toContain("h-segment");
    expect(words(buttonClasses("primary", { size: "sm" })).has("h-control")).toBe(false);
  });

  it("passes the tone and size through the Button component", () => {
    renderWithIntl(
      <Button tone="danger" size="sm">
        Excluir
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Excluir" });
    expect(button.className).toContain("bg-danger");
    expect(button.className).toContain("h-segment");
  });

  it("speaks in the panel's three tones", () => {
    renderWithIntl(
      <>
        <Panel data-testid="n">a</Panel>
        <Panel tone="info" data-testid="i">
          b
        </Panel>
        <Panel tone="danger" data-testid="d">
          c
        </Panel>
      </>,
    );
    expect(screen.getByTestId("n").className).toContain("border-line");
    expect(screen.getByTestId("i").className).toContain("bg-brand-wash");
    expect(screen.getByTestId("d").className).toContain("border-danger-ink");
  });

  it("sizes the spinner with the same words", () => {
    const { container } = renderWithIntl(<Spinner size="md" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("size-6");
  });
});
