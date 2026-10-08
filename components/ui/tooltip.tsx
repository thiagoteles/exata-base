"use client";

import { Tooltip as Primitive } from "radix-ui";
import type { ReactElement } from "react";
import { layerClasses } from "./styles";

const OPEN_DELAY_MS = 400;

/* Mount once near the root. Tooltips are for icon labels only, never necessary information. */
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <Primitive.Provider delayDuration={OPEN_DELAY_MS}>{children}</Primitive.Provider>
);

export function Tooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Primitive.Root>
      <Primitive.Trigger asChild={true}>{children}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content sideOffset={6} className={`${layerClasses} px-3 py-2 text-label`}>
          {label}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
