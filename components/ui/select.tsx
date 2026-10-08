"use client";

import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { Select as Primitive } from "radix-ui";
import { cn } from "@/lib/cn";
import type { FieldControlProps } from "./field";
import { controlClasses, layerClasses } from "./styles";

export type Option = { value: string; label: string };

type SelectProps = Partial<FieldControlProps> & {
  options: readonly Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
};

/** Radix Select, with a trigger shaped like a field. */
export function Select({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  id,
  ...aria
}: SelectProps) {
  return (
    <Primitive.Root
      value={value}
      onValueChange={onValueChange}
      {...(disabled === undefined ? {} : { disabled })}
    >
      <Primitive.Trigger
        id={id}
        className={cn(
          controlClasses,
          "flex items-center justify-between gap-2 text-left data-[placeholder]:text-ink-muted",
        )}
        {...aria}
      >
        <Primitive.Value placeholder={placeholder} />
        <Primitive.Icon>
          <IconChevronDown className="size-5 text-ink-muted" aria-hidden="true" />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          position="popper"
          sideOffset={8}
          className={cn(layerClasses, "min-w-(--radix-select-trigger-width) p-1")}
        >
          <Primitive.Viewport>
            {options.map((option) => (
              <Primitive.Item
                key={option.value}
                value={option.value}
                className="flex h-11 cursor-default items-center justify-between gap-2 rounded-cell px-3 text-body outline-none data-[highlighted]:bg-sunken data-[state=checked]:bg-brand-wash"
              >
                <Primitive.ItemText>{option.label}</Primitive.ItemText>
                <Primitive.ItemIndicator>
                  <IconCheck className="size-4 text-brand-ink" aria-hidden="true" />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
