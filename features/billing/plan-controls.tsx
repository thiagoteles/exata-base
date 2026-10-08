"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useErrorText } from "@/lib/use-error-text";
import { openPortal, setCancellation } from "./actions";

/** The provider's customer portal, where the card and the invoices live. */
export function PortalButton() {
  const t = useTranslations("plan");
  const describe = useErrorText();
  const notify = useToast();
  const [pending, setPending] = useState(false);

  const open = async () => {
    setPending(true);
    const result = await openPortal();
    if (result?.data !== undefined) {
      globalThis.location.assign(result.data.url);
      return;
    }
    setPending(false);
    notify({
      title: t("portalFailed"),
      description: describe(result?.serverError),
      tone: "danger",
    });
  };

  return (
    <Button variant="secondary" loading={pending} onClick={open}>
      {t("portal")}
    </Button>
  );
}

/** Cancels at the end of the paid period, or takes the cancellation back. */
export function CancellationControl({ canceling }: { canceling: boolean }) {
  const t = useTranslations("plan");
  const describe = useErrorText();
  const notify = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const change = async (cancel: boolean) => {
    setPending(true);
    const result = await setCancellation({ cancel });
    setPending(false);
    if (result?.data === undefined) {
      notify({
        title: cancel ? t("cancel.failed") : t("keep.failed"),
        description: describe(result?.serverError),
        tone: "danger",
      });
      return;
    }
    notify({ title: cancel ? t("canceled") : t("keep.done"), tone: "success" });
    router.refresh();
  };

  if (canceling) {
    return (
      <Button variant="secondary" loading={pending} onClick={() => change(false)}>
        {t("keep.title")}
      </Button>
    );
  }
  return (
    <ConfirmDialog
      trigger={<Button variant="secondary">{t("cancel.title")}</Button>}
      title={t("cancel.confirmTitle")}
      consequence={t("cancel.confirmBody")}
      confirmLabel={t("cancel.confirm")}
      cancelLabel={t("cancel.back")}
      onConfirm={() => change(true)}
      pending={pending}
    />
  );
}
