"use client";

import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { layerClasses } from "./styles";

type MenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  /** Extra classes for the floating list, for a product that draws its menus its own way. */
  className?: string;
};

export function Menu({ trigger, children, align = "end", className }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild={true}>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          className={cn(layerClasses, "min-w-56 p-1", className)}
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
  disabled?: boolean;
  /** Extra classes for the item, for a product that draws its menus its own way. */
  className?: string;
};

export function MenuItem({
  children,
  onSelect,
  icon,
  destructive = false,
  disabled = false,
  className,
}: MenuItemProps) {
  return (
    <DropdownMenu.Item
      {...(onSelect === undefined ? {} : { onSelect })}
      disabled={disabled}
      className={cn(
        "flex h-control cursor-default items-center gap-2 rounded-cell px-3 text-body outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-sunken",
        destructive ? "text-danger-ink" : "text-ink",
        className,
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
