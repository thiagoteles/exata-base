import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useId } from "react";

type AppShellProps = {
  /** The sidebar, drawn from `lg` up. */
  sidebar: ReactNode;
  /** The bottom bar, drawn below `lg`. */
  bottomBar: ReactNode;
  userMenu: ReactNode;
  children: ReactNode;
};

/*
 * The signed-in layout. The top bar is always above everything and only the content scrolls. The
 * sidebar and the user menu depend on the session, so they arrive as slots behind Suspense and
 * the frame itself stays in the static shell.
 */
export function AppShell({ sidebar, bottomBar, userMenu, children }: AppShellProps) {
  const t = useTranslations();
  const contentId = useId();
  return (
    <div className="flex h-dvh flex-col">
      <a
        href={`#${contentId}`}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-action focus:px-4 focus:py-3 focus:text-on-action"
      >
        {t("nav.skip")}
      </a>
      <header className="flex h-15 shrink-0 items-center justify-between border-b border-line bg-surface px-4 md:px-8">
        <Link
          href="/"
          className="text-block-title text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          {t("site.name")}
        </Link>
        {userMenu}
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-62 shrink-0 overflow-y-auto border-r border-line bg-surface lg:block">
          {sidebar}
        </aside>
        <main
          id={contentId}
          className="min-w-0 flex-1 overflow-y-auto px-4 pt-8 pb-24 md:px-8 lg:pb-8"
        >
          {children}
        </main>
      </div>
      {bottomBar}
    </div>
  );
}
