import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AnalyticsScript } from "@/components/analytics-script";
import { AppProviders } from "@/components/app-providers";
import { PageScript } from "@/components/page-script";
import { AuthProvider } from "@/lib/ports/auth/provider";
import { fontVariables } from "./fonts";
import "./globals.css";

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={await getLocale()} className={fontVariables} suppressHydrationWarning>
      <body>
        <PageScript />
        <NextIntlClientProvider>
          <AuthProvider>
            <AppProviders>{children}</AppProviders>
          </AuthProvider>
        </NextIntlClientProvider>
        <AnalyticsScript />
      </body>
    </html>
  );
}
