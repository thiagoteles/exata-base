"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import type { ErrorBody } from "@/lib/errors";
import { useErrorText } from "@/lib/use-error-text";

type Outcome = { data?: unknown | undefined; serverError?: ErrorBody["error"] | undefined };

/**
 * Runs one admin action and tells the person how it went: a toast with the catalog text on
 * success, the error text on failure, and a refresh of the page so it shows the new state.
 */
export function useRun(failedTitle: string) {
  const describe = useErrorText();
  const notify = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const run = async (task: () => Promise<Outcome | undefined>, doneTitle: string) => {
    setPending(true);
    const result = await task();
    setPending(false);
    if (result?.data === undefined) {
      notify({ title: failedTitle, description: describe(result?.serverError), tone: "danger" });
      return false;
    }
    notify({ title: doneTitle, tone: "success" });
    router.refresh();
    return true;
  };

  return { run, pending };
}
