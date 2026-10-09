import type { ReactNode } from "react";
import { Suspense } from "react";
import { PublicFooter } from "@/components/shell/public-footer";
import { PublicHeader } from "@/components/shell/public-header";
import { ThemePicker } from "@/features/account/theme-picker";
import { LanguageSwitcher } from "@/features/language/language-switcher";
import { isMultilingual } from "@/lib/i18n/locales";
import { offeredIntervals } from "@/lib/ports/payment";
import { HeaderActions, SignedOutActions } from "./header-actions";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader
        actions={
          <Suspense fallback={<SignedOutActions />}>
            <HeaderActions />
          </Suspense>
        }
      />
      <div className="flex-1">{children}</div>
      <PublicFooter
        showPlans={offeredIntervals().length > 0}
        themeSwitcher={<ThemePicker />}
        languageSwitcher={isMultilingual ? <LanguageSwitcher /> : null}
      />
    </div>
  );
}
