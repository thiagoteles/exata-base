import { IconChevronRight } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/cn";
import type { Size } from "./styles";

type Crumb = {
  label: string /** Missing on the page the person is on, which is the last one. */;
  href?: Route;
};

type BreadcrumbProps = {
  /** Names the trail for a screen reader. */
  label: string;
  items: readonly Crumb[];
  size?: Size;
};

const text: Record<Size, string> = { sm: "text-label", md: "text-body-small" };

/**
 * Where the page sits in the site, from the top down. Every step but the last is a link; the last is
 * plain text marked as the current page. On a narrow screen the trail wraps rather than scrolls.
 */
export function Breadcrumb({ label, items, size = "md" }: BreadcrumbProps) {
  return (
    <nav aria-label={label}>
      <ol className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", text[size])}>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={item.label}>
              <li className="flex items-center">
                {item.href === undefined || last ? (
                  <span
                    aria-current={last ? "page" : undefined}
                    className={last ? "text-ink" : "text-ink-muted"}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="text-brand-ink hover:underline">
                    {item.label}
                  </Link>
                )}
              </li>
              {last ? null : (
                <li aria-hidden="true" className="flex items-center text-ink-muted">
                  <IconChevronRight className="size-3.5 rtl:rotate-180" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
