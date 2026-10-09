import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AnalyticsScript } from "@/components/analytics-script";
import { AppProviders } from "@/components/app-providers";
import { AuthProvider } from "@/lib/ports/auth/screens";
import { themeScript } from "@/lib/theme";
import { fontVariables } from "./fonts";
import "./globals.css";

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={await getLocale()} className={fontVariables} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
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
