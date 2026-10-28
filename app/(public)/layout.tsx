import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  productHeaderActions,
  productPublicFooter,
  productPublicHeader,
} from "@/components/shell/public-chrome.product";
import { PublicFooter } from "@/components/shell/public-footer";
import { PublicHeader } from "@/components/shell/public-header";
import { ThemePicker } from "@/features/account/theme-picker";
import { ThemeToggle } from "@/features/account/theme-toggle";
import { LanguageSwitcher } from "@/features/language/language-switcher";
import { isMultilingual } from "@/lib/i18n/locales";
import { billingConfigured } from "@/lib/ports/payment/configured";
import { HeaderActions, SignedOutActions } from "./header-actions";

// A product that draws its own header or footer gets the same slots the base's are given.
const Header = productPublicHeader ?? PublicHeader;
const Footer = productPublicFooter ?? PublicFooter;
// The product's own theme switch and session buttons, when it draws them; the base's otherwise.
const ProductActions = productHeaderActions ?? (() => null);

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        actions={
          productHeaderActions === null ? (
            <>
              <ThemeToggle />
              <Suspense fallback={<SignedOutActions />}>
                <HeaderActions />
              </Suspense>
            </>
          ) : (
            <Suspense fallback={<ProductActions signedIn={false} />}>
              <HeaderActions />
            </Suspense>
          )
        }
      />
      <div className="flex-1">{children}</div>
      <Footer
        showPlans={billingConfigured()}
        themeSwitcher={<ThemePicker />}
        languageSwitcher={isMultilingual ? <LanguageSwitcher /> : null}
      />
    </div>
  );
}
