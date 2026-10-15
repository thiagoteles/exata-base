// @vitest-environment happy-dom
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { TrackedLink } from "./tracked-link";

const holder = globalThis as { window: { umami?: unknown } };

afterEach(() => {
  Reflect.deleteProperty(holder.window, "umami");
});

describe("a tracked link", () => {
  it("counts the click with the spot it sits in, and stays a link to the same address", () => {
    const calls: unknown[] = [];
    holder.window.umami = {
      track: (...args: unknown[]) => calls.push(args),
      identify: () => undefined,
    };
    renderWithIntl(
      <TrackedLink href="/sign-up" where="hero" onClick={(event) => event.preventDefault()}>
        Criar conta
      </TrackedLink>,
    );
    const link = screen.getByRole("link", { name: "Criar conta" });
    expect(link.getAttribute("href")).toBe("/sign-up");
    fireEvent.click(link);
    expect(calls).toEqual([["cta_click", { where: "hero" }]]);
  });
});
