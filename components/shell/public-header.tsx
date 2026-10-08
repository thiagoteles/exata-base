import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/** The actions slot holds whatever depends on the session, so the header itself stays static. */
export function PublicHeader({ actions }: { actions: ReactNode }) {
  const t = useTranslations();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-15 w-full max-w-310 items-center justify-between gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="text-block-title text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          {t("site.name")}
        </Link>
        <nav aria-label={t("nav.main")} className="flex items-center gap-3">
          {actions}
        </nav>
      </div>
    </header>
  );
}
