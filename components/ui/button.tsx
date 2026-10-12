"use client";

import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";
import { type ButtonVariant, buttonClasses, type ControlTone, type Size } from "./styles";

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  /** `danger` for what destroys; it keeps the variant's hierarchy. */
  tone?: ControlTone;
  size?: Size;
  /** Keeps the label and width, swaps the icon for an indicator, and ignores clicks. */
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  tone = "neutral",
  size = "md",
  loading = false,
  icon,
  type = "button",
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const ignoreWhileLoading = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  const leading = loading ? <Spinner /> : icon;
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      className={cn(buttonClasses(variant, { tone, size }), className)}
      onClick={ignoreWhileLoading}
      {...props}
    >
      {leading}
      {children}
    </button>
  );
}
