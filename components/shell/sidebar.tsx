"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isCurrent } from "./active-path";
import { NavIcon } from "./nav-icon";
import type { ShellGroup } from "./nav-types";

/**
 * From `lg` up: items of 40px in the smaller body size, one line each, 20px between groups. The
 * current item has the brand wash and a 3px bar.
 */
export function Sidebar({ groups, label }: { groups: readonly ShellGroup[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex flex-col gap-6 px-3 py-4">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          {group.label === null ? null : (
            <p className="px-3 pb-1 text-label text-ink-muted">{group.label}</p>
          )}
          {group.items.map((item) => {
            const current = isCurrent(pathname, item.href, item.exact);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-control items-center gap-2.5 rounded-control border-s-[3px] ps-2.5 pe-2 py-2 text-body-small focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  current
                    ? "border-brand bg-brand-wash font-semibold text-brand-ink"
                    : "border-transparent text-ink hover:bg-sunken",
                )}
              >
                <NavIcon name={item.icon} />
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
