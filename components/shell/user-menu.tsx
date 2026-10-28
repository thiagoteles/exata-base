"use client";

import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * What a product's own user area is given: the person already resolved (null while a Clerk sign-in
 * waits for its row), the labels, where the account lives and the sign-out control of the auth
 * mode. It draws the whole end of the top bar, the theme switch included (`useThemeToggle`, in components/shell).
 */
export type UserAreaProps = {
  user: { name: string; email: string; image: string | null; roleLabel: string } | null;
  menuLabel: string;
  accountLabel: string;
  accountHref: Route;
  signOut: ReactNode;
};

type UserMenuProps = {
  name: string;
  email: string;
  /** The provider's picture, shown in place of the initial when there is one. */
  image: string | null;
  roleLabel: string;
  menuLabel: string;
  accountLabel: string;
  /** The sign-out control of the current auth mode, drawn by the auth port. */
  signOut: ReactNode;
};

/** The person's initial in a square of 44px; it opens their account and the way out. */
export function UserMenu({
  name,
  email,
  image,
  roleLabel,
  menuLabel,
  accountLabel,
  signOut,
}: UserMenuProps) {
  const initial = (name.trim() || email).charAt(0).toUpperCase();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={menuLabel}
          className="inline-flex size-control items-center justify-center overflow-hidden rounded-control border-2 border-line-strong bg-surface font-semibold text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {image === null ? (
            initial
          ) : (
            // biome-ignore lint/performance/noImgElement: a provider's avatar URL, outside the image optimizer's allowed hosts
            <img src={image} alt="" className="size-full object-cover" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="px-3 py-2">
          <p className="truncate text-body font-semibold text-ink">{name.trim() || email}</p>
          <p className="truncate text-body-small text-ink-muted">{email}</p>
          <p className="text-label text-ink-muted">{roleLabel}</p>
        </div>
        <Link
          href="/account"
          className="flex h-control items-center rounded-cell px-3 text-body text-ink hover:bg-sunken"
        >
          {accountLabel}
        </Link>
        {signOut}
      </PopoverContent>
    </Popover>
  );
}
