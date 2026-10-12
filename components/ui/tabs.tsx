"use client";

import { Tabs as Primitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Size } from "./styles";

type Tab = { value: string; label: string; content: ReactNode; disabled?: boolean };

type TabsProps = {
  /** Names the set of tabs for a screen reader. */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  tabs: readonly Tab[];
  size?: Size;
};

const heights: Record<Size, string> = {
  sm: "h-segment text-body-small",
  md: "h-control text-button pointer-coarse:h-control-coarse",
};

/**
 * Panels that share one place, switched by the row of names above them. The chosen name is underlined
 * in ink, not filled: the row reads as a line of text, not as buttons. Arrow keys move and choose,
 * and a row wider than the screen scrolls on its own instead of wrapping.
 */
export function Tabs({ label, value, onValueChange, tabs, size = "md" }: TabsProps) {
  return (
    <Primitive.Root value={value} onValueChange={onValueChange} className="flex flex-col gap-4">
      <Primitive.List
        aria-label={label}
        className="flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:thin]"
      >
        {tabs.map((tab) => (
          <Primitive.Trigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              "-mb-px shrink-0 border-b-2 border-transparent font-semibold text-ink-muted hover:text-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              "data-[state=active]:border-ink data-[state=active]:text-ink",
              "disabled:opacity-50",
              heights[size],
            )}
          >
            {tab.label}
          </Primitive.Trigger>
        ))}
      </Primitive.List>
      {tabs.map((tab) => (
        <Primitive.Content
          key={tab.value}
          value={tab.value}
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          {tab.content}
        </Primitive.Content>
      ))}
    </Primitive.Root>
  );
}
