import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { productFooterLinks } from "@/lib/footer-links.product";
import { publicHref } from "@/lib/i18n/public-paths";

export type PublicFooterProps = {
  showPlans: boolean;
  themeSwitcher?: ReactNode;
  languageSwitcher?: ReactNode;
};

/**
 * The product's own pages come first, then the base's. The plans link shows only when something is
 * on sale, and the language choice only when there is one to make. The theme choice is the
 * visitor's own and is always there.
 */
export function PublicFooter({
  showPlans,
  themeSwitcher = null,
  languageSwitcher = null,
}: PublicFooterProps) {
  const t = useTranslations();
  return (
    <footer className="border-t border-line print:hidden">
      <div className="mx-auto flex w-full max-w-310 flex-col gap-2 px-4 py-8 text-body-small text-ink-muted md:flex-row md:items-center md:justify-between md:px-8">
        <p>{t("site.name")}</p>
        <nav aria-label={t("nav.footer")} className="flex flex-wrap gap-x-6 gap-y-2">
          {productFooterLinks.map((link) => (
            <Link key={link.key} href={link.href} className="hover:text-ink">
              {t(`nav.footerLinks.${link.key}` as never)}
            </Link>
          ))}
          {showPlans ? (
            <Link href={publicHref("/plans")} className="hover:text-ink">
              {t("nav.plans")}
            </Link>
          ) : null}
          <Link href={publicHref("/articles")} className="hover:text-ink">
            {t("nav.articles")}
          </Link>
          <Link href={publicHref("/contact")} className="hover:text-ink">
            {t("nav.contact")}
          </Link>
          <Link href={publicHref("/privacy")} className="hover:text-ink">
            {t("nav.privacy")}
          </Link>
          <Link href={publicHref("/terms")} className="hover:text-ink">
            {t("nav.terms")}
          </Link>
        </nav>
        {themeSwitcher === null && languageSwitcher === null ? null : (
          <div className="flex flex-wrap items-center gap-3">
            {themeSwitcher}
            {languageSwitcher}
          </div>
        )}
      </div>
    </footer>
  );
}
