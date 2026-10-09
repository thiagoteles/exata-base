import { cn } from "@/lib/cn";
import type { Size } from "./styles";

type MeterProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  /** Past this the reading is a warning. */
  high?: number;
  /** Words for the reading, such as "8,4 GB de 10 GB", for people who cannot see the bar. */
  valueText?: string;
  size?: Size;
};

const tracks: Record<Size, string> = { sm: "h-1.5", md: "h-2.5" };

/**
 * A quantity within a range that is not a task: storage used, a score, a quota. It turns to the
 * warning tone past `high`, and it says so in words, since color alone says nothing. Not a
 * progress bar: nothing here is on its way anywhere.
 */
export function Meter({
  label,
  value,
  min = 0,
  max = 100,
  high,
  valueText,
  size = "md",
}: MeterProps) {
  const share = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const warning = high !== undefined && value > high;
  return (
    // biome-ignore lint/a11y/useSemanticElements: the native meter cannot be drawn the same in every browser, so the bar is drawn and given the meter role
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      {...(valueText === undefined ? {} : { "aria-valuetext": valueText })}
      className={cn("w-full overflow-hidden rounded-full bg-sunken", tracks[size])}
    >
      <div
        className={cn("h-full rounded-full", warning ? "bg-warning" : "bg-brand")}
        style={{ width: `${share * 100}%` }}
      />
    </div>
  );
}
