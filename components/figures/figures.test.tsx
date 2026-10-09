// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { ArcGauge } from "./arc-gauge";
import { SvgText } from "./svg-text";

const inSvg = (children: React.ReactNode) => (
  <svg role="img" aria-label="figura">
    {children}
  </svg>
);

describe("SvgText", () => {
  it("writes the catalog's sentence for a key, and fills its values", () => {
    renderWithIntl(
      inSvg(
        <>
          <SvgText x={0} y={0} messageKey="ui.back" />
          <SvgText
            x={0}
            y={10}
            messageKey="catalog.measures.storageText"
            values={{ used: 6, total: 10 }}
          />
        </>,
      ),
    );
    expect(screen.getByText("Voltar")).toBeTruthy();
    expect(screen.getByText("6 GB de 10 GB")).toBeTruthy();
  });

  it("writes notation as it comes, in the interface's own roles", () => {
    renderWithIntl(
      inSvg(<SvgText x={5} y={5} text="C♯4" variant="data" tone="muted" anchor="start" />),
    );
    const node = screen.getByText("C♯4");
    expect(node.getAttribute("text-anchor")).toBe("start");
    expect(node.getAttribute("class")).toContain("text-data");
    expect(node.getAttribute("class")).toContain("fill-ink-muted");
  });

  it("adds the halo only when asked", () => {
    renderWithIntl(
      inSvg(
        <>
          <SvgText x={0} y={0} text="a" halo />
          <SvgText x={0} y={9} text="b" />
        </>,
      ),
    );
    expect(screen.getByText("a").getAttribute("class")).toContain("stroke-surface");
    expect(screen.getByText("b").getAttribute("class")).not.toContain("stroke-surface");
  });
});

describe("ArcGauge", () => {
  const gauge = (value: number) =>
    renderWithIntl(
      <ArcGauge
        value={value}
        min={0}
        max={100}
        summary="Uso do mês: 62 de 100"
        reading="62"
        captionKey="catalog.figures.caption"
        scale={["0", "50", "100"]}
      />,
    );

  it("is one picture with its reading in the summary, and shows the reading and the caption", () => {
    gauge(62);
    expect(screen.getByRole("img", { name: "Uso do mês: 62 de 100" })).toBeTruthy();
    expect(screen.getByText("62")).toBeTruthy();
    expect(screen.getByText("Uso do mês")).toBeTruthy();
  });

  it("draws the value over the track, and only the track at the bottom of the scale", () => {
    const { container, unmount } = gauge(62);
    expect(container.querySelectorAll("path")).toHaveLength(2);
    unmount();
    const empty = gauge(0);
    expect(empty.container.querySelectorAll("path")).toHaveLength(1);
  });

  it("marks the scale", () => {
    const { container } = gauge(10);
    expect(container.querySelectorAll("line")).toHaveLength(3);
    for (const mark of ["0", "50", "100"]) {
      expect(screen.getAllByText(mark).length).toBeGreaterThan(0);
    }
  });
});
