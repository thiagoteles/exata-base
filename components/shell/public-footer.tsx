import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/** The plans link shows only when something is on sale, and the language choice only when there is one to make. */
export function PublicFooter({
  showPlans,
  languageSwitcher = null,
}: {
  showPlans: boolean;
  languageSwitcher?: ReactNode;
}) {
  const t = useTranslations();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-310 flex-col gap-2 px-4 py-8 text-body-small text-ink-muted md:flex-row md:items-center md:justify-between md:px-8">
        <p>{t("site.name")}</p>
        <nav aria-label={t("nav.footer")} className="flex gap-6">
          {showPlans ? (
            <Link href="/plans" className="hover:text-ink">
              {t("nav.plans")}
            </Link>
          ) : null}
          <Link href="/contact" className="hover:text-ink">
            {t("nav.contact")}
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            {t("nav.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-ink">
            {t("nav.terms")}
          </Link>
        </nav>
        {languageSwitcher}
      </div>
    </footer>
  );
}
