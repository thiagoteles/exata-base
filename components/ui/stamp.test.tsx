// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Stamp, type StampTone } from "./stamp";

const tones: StampTone[] = ["done", "progress", "attention", "refused", "neutral"];

describe("Stamp", () => {
  it("always carries the state as text, with a shape that is not the same for two states", () => {
    const shapes = tones.map((tone) => {
      const { container, unmount } = renderWithIntl(<Stamp tone={tone}>{tone}</Stamp>);
      expect(screen.getByText(tone)).toBeTruthy();
      const shape = container.querySelector("svg")?.innerHTML ?? "";
      unmount();
      return shape;
    });
    expect(new Set(shapes).size).toBe(tones.length);
    expect(shapes.every((shape) => shape.length > 0)).toBe(true);
  });
});
