import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { NavIcon } from "@/components/shell/nav-icon";
import type { NavItem } from "@/lib/navigation";

/** One card per screen: its icon, its name as the menu says it, and what it is for when known. */
export async function AdminHub({ destinations }: { destinations: readonly NavItem[] }) {
  const [nav, t] = await Promise.all([getTranslations("nav"), getTranslations("admin.hub")]);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {destinations.map((item) => {
        const about = `about.${item.key}`;
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex h-full gap-4 rounded-panel border border-line bg-surface p-5 transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span className="mt-0.5 text-brand-ink">
                <NavIcon name={item.icon} />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-block-title font-bold text-ink">
                  {nav(`items.${item.key}` as never)}
                </span>
                {t.has(about as never) ? (
                  <span className="text-body-small text-ink-muted">{t(about as never)}</span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
