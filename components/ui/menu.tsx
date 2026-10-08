"use client";

import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { layerClasses } from "./styles";

type MenuProps = { trigger: ReactNode; children: ReactNode; align?: "start" | "end" };

export function Menu({ trigger, children, align = "end" }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild={true}>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          className={cn(layerClasses, "min-w-56 p-1")}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type MenuItemProps = {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  destructive?: boolean;
};

export function MenuItem({ children, onSelect, icon, destructive = false }: MenuItemProps) {
  return (
    <DropdownMenu.Item
      {...(onSelect === undefined ? {} : { onSelect })}
      className={cn(
        "flex h-11 cursor-default items-center gap-2 rounded-cell px-3 text-body outline-none data-[highlighted]:bg-sunken",
        destructive ? "text-danger-ink" : "text-ink",
      )}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-line" />;
}
