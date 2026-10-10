"use client";

import { IconPrinter } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** What sits above the sheet on screen and never reaches paper: the way back and the print button. */
export function PrintBar() {
  const t = useTranslations("patterns.print");
  const router = useRouter();
  return (
    <div className="mx-auto mb-6 flex w-full max-w-sheet items-center justify-between gap-4 print:hidden">
      <Button variant="secondary" onClick={() => router.back()}>
        {t("back")}
      </Button>
      <Button
        icon={<IconPrinter className="size-5" aria-hidden="true" />}
        onClick={() => globalThis.print()}
      >
        {t("print")}
      </Button>
    </div>
  );
}
