"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteUser, refundUser } from "./actions";
import { useRun } from "./use-run";

/** Returns the last payment in full. The plan changes when the provider confirms the refund. */
export function RefundPayment({ id }: { id: string }) {
  const t = useTranslations("admin.user.refund");
  const failed = useTranslations("admin.user");
  const { run, pending } = useRun(failed("failed"));
  return (
    <ConfirmDialog
      trigger={<Button variant="danger">{t("title")}</Button>}
      title={t("confirmTitle")}
      consequence={t("confirmBody")}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      onConfirm={() => run(() => refundUser({ id }), t("done"))}
      pending={pending}
    />
  );
}

/** Deletes someone's account. After it, the record no longer exists, so the page goes back to the list. */
export function DeleteUser({ id }: { id: string }) {
  const t = useTranslations("admin.user.delete");
  const failed = useTranslations("admin.user");
  const router = useRouter();
  const { run, pending } = useRun(failed("failed"));
  return (
    <ConfirmDialog
      trigger={<Button variant="danger">{t("title")}</Button>}
      title={t("confirmTitle")}
      consequence={t("confirmBody")}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        if (await run(() => deleteUser({ id }), t("done"))) {
          router.replace("/admin/users");
        }
      }}
      pending={pending}
    />
  );
}
