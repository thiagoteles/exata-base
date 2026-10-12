"use client";

import { Popover as Primitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { layerClasses } from "./styles";

export function Popover(props: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root {...props} />;
}

export function PopoverTrigger(props: ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger {...props} />;
}

export function PopoverContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        className={cn(layerClasses, "w-72 p-4", className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
