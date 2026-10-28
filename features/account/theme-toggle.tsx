"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useThemeToggle } from "@/components/shell/use-theme-toggle";

/*
 * One button in the top bar that turns the dark theme on or off. The icon follows the theme in CSS,
 * so it is right before any script runs; the pressed state is read from the page once it mounts.
 * The finer choice, "follow the system", stays with the theme picker.
 */
export function ThemeToggle() {
  const { dark, label, flip } = useThemeToggle();
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={dark ?? undefined}
      onClick={flip}
      className="inline-flex size-control shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors duration-120 ease-enter hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-coarse:size-control-coarse"
    >
      <IconMoon aria-hidden="true" className="size-[1.25rem] dark:hidden" stroke={1.75} />
      <IconSun aria-hidden="true" className="hidden size-[1.25rem] dark:block" stroke={1.75} />
    </button>
  );
}
