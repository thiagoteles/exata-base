"use client";

import { useTranslations } from "next-intl";
import type { ErrorBody } from "@/lib/errors";

/** Turns the error an action returned into the sentence to show, with the code to quote on a 500. */
export function useErrorText() {
  const t = useTranslations("errors");
  return (error: ErrorBody["error"] | undefined): string | undefined => {
    if (error === undefined) {
      return undefined;
    }
    const sentence = t(error.key as never, { requestId: error.requestId } as never);
    return error.status === 500
      ? `${sentence} ${t("requestId", { requestId: error.requestId })}`
      : sentence;
  };
}
