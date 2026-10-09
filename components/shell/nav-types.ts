import type { Route } from "next";

/** A destination as the shell draws it: already translated, so the client never needs the catalog for it. */
export type ShellItem = {
  key: string;
  href: Route;
  label: string;
  icon: "user" | "mail" | "inbox" | "card" | "users" | "send" | "history" | "chart" | "pulse";
  exact?: boolean;
};

export type ShellGroup = { key: string; label: string | null; items: ShellItem[] };
