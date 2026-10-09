"use client";

import { Slider as Primitive } from "radix-ui";
import { cn } from "@/lib/cn";
import type { ControlTone, Size } from "./styles";

type SliderProps = {
  /** Names the control. With two values it names the range, and the thumbs are "from" and "to". */
  label: string;
  value: readonly number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: Size;
  tone?: ControlTone;
  /** Names each thumb for a screen reader, in order, such as ["De", "Até"]. Alone, a thumb takes the name of the slider. */
  thumbLabels?: readonly string[];
};

const tracks: Record<Size, string> = { sm: "h-1.5", md: "h-2.5" };
const thumbs: Record<Size, string> = { sm: "size-4", md: "size-5" };
const ranges: Record<ControlTone, string> = { neutral: "bg-action", danger: "bg-danger" };

/**
 * One value or a range on a line. The arrow keys move a thumb by one step, Page keys by ten, and
 * Home and End to the ends. The thumb is as large as a hand needs it, bigger than the line it rides.
 */
export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  size = "md",
  tone = "neutral",
  thumbLabels,
}: SliderProps) {
  return (
    <Primitive.Root
      value={[...value]}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      {...(disabled === undefined ? {} : { disabled })}
      aria-label={label}
      className="relative flex h-control w-full touch-none items-center select-none data-[disabled]:opacity-50"
    >
      <Primitive.Track
        className={cn("relative grow overflow-hidden rounded-full bg-sunken", tracks[size])}
      >
        <Primitive.Range className={cn("absolute h-full", ranges[tone])} />
      </Primitive.Track>
      {value.map((_, index) => (
        <Primitive.Thumb
          // The thumbs are positional: the first is always the first.
          // biome-ignore lint/suspicious/noArrayIndexKey: a thumb has no identity but its place
          key={index}
          aria-label={
            thumbLabels?.[index] ?? (value.length === 1 ? label : `${label} ${index + 1}`)
          }
          className={cn(
            "block rounded-full border-2 border-ink bg-surface",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            thumbs[size],
          )}
        />
      ))}
    </Primitive.Root>
  );
}
