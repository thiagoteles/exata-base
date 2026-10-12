"use client";

import { createTranslator } from "next-intl";
import errorPage from "@/messages/pt-BR/errorPage.json";
import "./globals.css";
import { useReportError } from "@/lib/use-report-error";

/*
 * The last resort, for an error in the root layout itself. It replaces the whole document, so it
 * cannot use the providers and loads its own copy of its sentences and the styles. Only its own
 * area of the catalog: the whole catalog would be compiled into every page.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useReportError(error, "global");
  const t = createTranslator({ locale: "pt-BR", messages: { errorPage }, namespace: "errorPage" });
  return (
    <html lang="pt-BR">
      <body>
        <main className="mx-auto flex min-h-dvh w-full max-w-170 flex-col justify-center gap-4 px-4 py-12">
          <h1 className="text-page-title">{t("title")}</h1>
          <p className="text-body">{t("body")}</p>
          {error.digest === undefined ? null : (
            <p className="font-mono text-data text-ink-muted">
              {t("code", { code: error.digest })}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            className="h-control self-start rounded-control bg-action px-4.5 text-button font-semibold text-on-action"
          >
            {t("retry")}
          </button>
        </main>
      </body>
    </html>
  );
}
