"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type UserMenuProps = {
  name: string;
  email: string;
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
          className="inline-flex size-control items-center justify-center rounded-control border-2 border-line-strong bg-surface font-semibold text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {initial}
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
