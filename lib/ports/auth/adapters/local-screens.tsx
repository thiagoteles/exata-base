"use client";

import { createAuthClient } from "better-auth/react";
import { useTranslations } from "next-intl";

const client = createAuthClient();

/** Local mode signs out through the auth API, which clears the session cookie. */
export function LocalSignOut({ className }: { className: string }) {
  const t = useTranslations("auth");
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await client.signOut();
        globalThis.location.assign("/");
      }}
    >
      {t("signOut")}
    </button>
  );
}
