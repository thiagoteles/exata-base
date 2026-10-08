"use client";

import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";
import { type ButtonVariant, buttonClasses } from "./styles";

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  /** Keeps the label and width, swaps the icon for an indicator, and ignores clicks. */
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
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
      className={cn(buttonClasses(variant), className)}
      onClick={ignoreWhileLoading}
      {...props}
    >
      {leading}
      {children}
    </button>
  );
}
