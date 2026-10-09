"use client";

import { IconArrowLeft, IconDots } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { type ButtonVariant, buttonClasses } from "@/components/ui/styles";

export type HeaderAction = {
  key: string;
  label: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  href?: Route;
  onSelect?: () => void;
};

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** On by default; turn it off on screens that are a destination, like a home page. */
  showBack?: boolean;
  actions?: readonly HeaderAction[];
};

const MENU_THRESHOLD = 2;

function ActionButton({ action }: { action: HeaderAction }) {
  const variant = action.variant ?? "secondary";
  if (action.href !== undefined) {
    return (
      <Link href={action.href} className={buttonClasses(variant)}>
        {action.icon}
        {action.label}
      </Link>
    );
  }
  return (
    <Button variant={variant} icon={action.icon} onClick={action.onSelect}>
      {action.label}
    </Button>
  );
}

/** Below `sm`, more than two actions fold into one menu instead of crowding the title. */
function HeaderActions({ actions }: { actions: readonly HeaderAction[] }) {
  const t = useTranslations("patterns.header");
  const router = useRouter();
  const folds = actions.length > MENU_THRESHOLD;
  return (
    <>
      <div className={`flex flex-wrap items-center gap-3 ${folds ? "max-sm:hidden" : ""}`}>
        {actions.map((action) => (
          <ActionButton key={action.key} action={action} />
        ))}
      </div>
      {folds ? (
        <div className="sm:hidden">
          <Menu
            trigger={
              <Button
                variant="secondary"
                aria-label={t("moreActions")}
                icon={<IconDots className="size-5" aria-hidden="true" />}
              />
            }
          >
            {actions.map((action) => (
              <MenuItem
                key={action.key}
                onSelect={() =>
                  action.href === undefined ? action.onSelect?.() : router.push(action.href)
                }
                {...(action.icon === undefined ? {} : { icon: action.icon })}
              >
                {action.label}
              </MenuItem>
            ))}
          </Menu>
        </div>
      ) : null}
    </>
  );
}

/** Title, optional subtitle, a back button and the screen's general actions, 32px above the content. */
export function PageHeader({ title, subtitle, showBack = true, actions = [] }: PageHeaderProps) {
  const t = useTranslations("patterns.header");
  const router = useRouter();
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        {showBack ? (
          <button
            type="button"
            aria-label={t("back")}
            onClick={() => router.back()}
            className="inline-flex size-control shrink-0 items-center justify-center rounded-control border-2 border-line-strong bg-surface text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <IconArrowLeft className="size-5" aria-hidden="true" />
          </button>
        ) : null}
        <div>
          <h1 className="text-page-title text-ink">{title}</h1>
          {subtitle === undefined ? null : (
            <p className="mt-1 text-body text-ink-muted">{subtitle}</p>
          )}
        </div>
      </div>
      {actions.length > 0 ? <HeaderActions actions={actions} /> : null}
    </header>
  );
}
