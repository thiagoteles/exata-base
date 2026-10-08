"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ErrorView } from "@/components/shell/error-view";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/styles";
import { useReportError } from "@/lib/use-report-error";

/*
 * Shown when a page or an action throws. The digest is the same code the server wrote to the log
 * for this error, so a person can quote it and the team can find the exact line.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useReportError(error, "page");
  const t = useTranslations("errorPage");
  return (
    <ErrorView
      title={t("title")}
      body={t("body")}
      {...(error.digest === undefined ? {} : { code: t("code", { code: error.digest }) })}
      actions={
        <>
          <Button onClick={() => retry()}>{t("retry")}</Button>
          <Link href="/" className={buttonClasses("secondary")}>
            {t("home")}
          </Link>
        </>
      }
    />
  );
}
