// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { Meter } from "./meter";
import { Progress } from "./progress";
import { Skeleton, SkeletonGroup } from "./skeleton";
import { Slider } from "./slider";

describe("Progress", () => {
  it("is a progress bar with a name and the share done", () => {
    renderWithIntl(<Progress label="Envio" value={30} max={120} showValue />);
    const bar = screen.getByRole("progressbar", { name: "Envio" });
    expect(bar.getAttribute("aria-valuenow")).toBe("30");
    expect(bar.getAttribute("aria-valuemax")).toBe("120");
    expect(screen.getByText("30 / 120")).toBeTruthy();
  });

  it("clamps the fill inside the track", () => {
    renderWithIntl(<Progress label="Acima" value={500} max={100} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.transform).toBe("translateX(-0%)");
  });
});

describe("Meter", () => {
  it("is a meter with its range and words for the reading", () => {
    renderWithIntl(
      <Meter label="Armazenamento" value={8.4} max={10} valueText="8,4 GB de 10 GB" />,
    );
    const meter = screen.getByRole("meter", { name: "Armazenamento" });
    expect(meter.getAttribute("aria-valuenow")).toBe("8.4");
    expect(meter.getAttribute("aria-valuetext")).toBe("8,4 GB de 10 GB");
  });

  it("turns to the warning tone only past the high mark", () => {
    const fill = () => screen.getByRole("meter").firstElementChild as HTMLElement;
    const { rerender } = renderWithIntl(<Meter label="Cota" value={70} high={80} />);
    expect(fill().className).toContain("bg-brand");
    rerender(<Meter label="Cota" value={90} high={80} />);
    expect(fill().className).toContain("bg-warning");
  });
});

function SliderHarness({ initial = [20] }: { initial?: number[] }) {
  const [value, setValue] = useState(initial);
  return (
    <Slider
      label="Volume"
      value={value}
      onValueChange={setValue}
      thumbLabels={initial.length === 2 ? ["De", "Até"] : ["Volume"]}
    />
  );
}

describe("Slider", () => {
  it("moves by a step with the arrows, by ten with Page keys, and to the ends with Home and End", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SliderHarness />);
    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(thumb.getAttribute("aria-valuenow")).toBe("20");
    await user.tab();
    expect(document.activeElement).toBe(thumb);
    await user.keyboard("{ArrowRight}");
    expect(thumb.getAttribute("aria-valuenow")).toBe("21");
    await user.keyboard("{PageUp}");
    expect(thumb.getAttribute("aria-valuenow")).toBe("31");
    await user.keyboard("{End}");
    expect(thumb.getAttribute("aria-valuenow")).toBe("100");
    await user.keyboard("{Home}");
    expect(thumb.getAttribute("aria-valuenow")).toBe("0");
  });

  it("gives a lone thumb the name of the slider, and numbers the thumbs of an unnamed range", () => {
    renderWithIntl(<Slider label="Brilho" value={[5]} onValueChange={() => undefined} />);
    expect(screen.getByRole("slider", { name: "Brilho" })).toBeTruthy();
    renderWithIntl(<Slider label="Faixa" value={[1, 9]} onValueChange={() => undefined} />);
    expect(screen.getByRole("slider", { name: "Faixa 1" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Faixa 2" })).toBeTruthy();
  });

  it("names each thumb of a range", () => {
    renderWithIntl(<SliderHarness initial={[10, 60]} />);
    expect(screen.getByRole("slider", { name: "De" }).getAttribute("aria-valuenow")).toBe("10");
    expect(screen.getByRole("slider", { name: "Até" }).getAttribute("aria-valuenow")).toBe("60");
  });
});

describe("Skeleton", () => {
  it("is announced once as a status and hides its pieces from a screen reader", () => {
    renderWithIntl(
      <SkeletonGroup label="Carregando pedidos">
        <Skeleton className="w-1/2" />
        <Skeleton shape="circle" />
      </SkeletonGroup>,
    );
    expect(screen.getByRole("status", { name: "Carregando pedidos" })).toBeTruthy();
    expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});
