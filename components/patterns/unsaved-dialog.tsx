"use client";

import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type UnsavedDialogProps = { open: boolean; onLeave: () => void; onStay: () => void };

/** The dialog that `useUnsavedGuard` opens when a link would drop unsaved changes. */
export function UnsavedDialog({ open, onLeave, onStay }: UnsavedDialogProps) {
  const t = useTranslations("patterns.unsaved");
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onStay())}
      title={t("title")}
      consequence={t("consequence")}
      confirmLabel={t("leave")}
      cancelLabel={t("stay")}
      onConfirm={onLeave}
    />
  );
}
