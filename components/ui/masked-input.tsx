"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Input } from "./field";

type MaskedInputProps = Omit<ComponentProps<"input">, "onChange" | "value" | "prefix"> & {
  mask: (value: string) => string;
  value: string;
  onValueChange: (value: string) => void;
  /** A fixed mark before the value, such as the currency symbol. */
  prefix?: string;
};

/** A controlled input that formats as it is typed. Numbers and codes are always set in mono. */
export function MaskedInput({
  mask,
  value,
  onValueChange,
  prefix,
  className,
  ...props
}: MaskedInputProps) {
  return (
    <span className="relative block">
      {prefix === undefined ? null : (
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-data text-ink-muted">
          {prefix}
        </span>
      )}
      <Input
        inputMode="numeric"
        autoComplete="off"
        className={cn("font-mono text-data", prefix === undefined ? undefined : "pl-12", className)}
        value={mask(value)}
        onChange={(event) => onValueChange(mask(event.target.value))}
        {...props}
      />
    </span>
  );
}
