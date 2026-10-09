"use client";

import { IconDots } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { isCurrent } from "./active-path";
import { NavIcon } from "./nav-icon";
import type { ShellItem } from "./nav-types";

type BottomBarProps = {
  items: readonly ShellItem[];
  more: readonly ShellItem[];
  label: string;
  moreLabel: string;
  moreTitle: string;
};

const slot =
  "flex h-tab flex-1 flex-col items-center justify-center gap-0.5 text-label focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";

/*
 * Below `lg` the sidebar becomes a bar of at most four destinations, each filling its whole column
 * as a target. What does not fit goes into a sheet behind "More".
 */
export function BottomBar({ items, more, label, moreLabel, moreTitle }: BottomBarProps) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const current = isCurrent(pathname, item.href, item.exact);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              slot,
              current ? "bg-brand-wash font-semibold text-brand-ink" : "text-ink-muted",
            )}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
      {more.length === 0 ? null : (
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className={cn(slot, "text-ink-muted")}>
              <IconDots className="size-5" aria-hidden="true" />
              {moreLabel}
            </button>
          </DialogTrigger>
          <DialogContent title={moreTitle}>
            <ul className="mt-4 flex flex-col">
              {more.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex h-control items-center gap-3 rounded-control px-3 text-body hover:bg-sunken"
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      )}
    </nav>
  );
}
