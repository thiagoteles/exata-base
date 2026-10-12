"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { withdrawInvite } from "./actions";
import { useRun } from "./use-run";

/** Withdraws a pending invite: the link already sent stops working. */
export function RevokeInvite({ id, email }: { id: string; email: string }) {
  const t = useTranslations("admin.invites.revoke");
  const failed = useTranslations("admin.invites.form");
  const { run, pending } = useRun(failed("failed"));
  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" aria-label={t("label", { email })}>
          {t("action")}
        </Button>
      }
      title={t("title")}
      consequence={t("body", { email })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      onConfirm={() => run(() => withdrawInvite({ id }), t("done"))}
      pending={pending}
    />
  );
}
