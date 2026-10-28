import Link from "next/link";
import type { AdminHubProps } from "@/components/patterns/admin-hub";
import { PageHeader } from "@/components/patterns/page-header";
import { NavIcon } from "@/components/shell/nav-icon";

/** The base's hub: one card per screen, its icon, its name as the menu says it, and what it is for. */
export function AdminHub({ title, subtitle, destinations }: AdminHubProps) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} showBack={false} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex h-full gap-4 rounded-panel border border-line bg-surface p-5 transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span className="mt-0.5 text-brand-ink">
                <NavIcon name={item.icon} />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-block-title font-bold text-ink">{item.label}</span>
                {item.about === null ? null : (
                  <span className="text-body-small text-ink-muted">{item.about}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
