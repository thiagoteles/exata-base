import { clampChroma, converter, type Oklch } from "culori";
import type { Theme } from "./generate";

/*
 * Colors for charts. The categorical order is the reference palette of the data visualization
 * method, validated as a set against this base's surfaces in both themes: adjacent pairs stay
 * apart under protan, deutan and normal vision. The order is the safety mechanism, so a chart
 * takes slots in order and never cycles them; a ninth series folds into "Other". Three light
 * slots sit under 3:1 on the light surface, so every chart ships direct labels or a table.
 * The sequential ramp is the brand hue from light to dark; the diverging pair is blue and red
 * around a neutral gray.
 */

const toOklch = converter("oklch");

const categorical: Record<Theme, readonly string[]> = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

/* Lightness and chroma of each sequential step, lightest first. */
const sequentialSteps = [
  [0.93, 0.04],
  [0.85, 0.07],
  [0.76, 0.1],
  [0.66, 0.12],
  [0.56, 0.13],
  [0.46, 0.12],
  [0.37, 0.1],
] as const;

const diverging: Record<Theme, { negative: string; middle: string; positive: string }> = {
  light: { negative: "#e34948", middle: "#ecebe8", positive: "#2a78d6" },
  dark: { negative: "#e66767", middle: "#3a3a37", positive: "#3987e5" },
};

export type DataPalette = readonly [string, Oklch][];

export function generateDataPalette(theme: Theme, brandHue: number): DataPalette {
  const slots = categorical[theme].map(
    (hex, index) => [`chart-${index + 1}`, toOklch(hex) as Oklch] as [string, Oklch],
  );
  const ramp = sequentialSteps.map(
    ([l, c], index) =>
      [
        `chart-seq-${index + 1}`,
        clampChroma({ mode: "oklch", l, c, h: brandHue }, "oklch") as Oklch,
      ] as [string, Oklch],
  );
  const poles = Object.entries(diverging[theme]).map(
    ([pole, hex]) => [`chart-${pole}`, toOklch(hex) as Oklch] as [string, Oklch],
  );
  return [...slots, ...ramp, ...poles];
}
