"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useErrorText } from "@/lib/use-error-text";
import { deleteOwnAccount } from "./actions";

/** The one destructive action of the account page. It always asks first, and says what is lost. */
export function DeleteAccount() {
  const t = useTranslations("account.delete");
  const describe = useErrorText();
  const notify = useToast();
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    const result = await deleteOwnAccount();
    if (result?.data !== undefined) {
      globalThis.location.assign("/");
      return;
    }
    setPending(false);
    notify({ title: t("failed"), description: describe(result?.serverError), tone: "danger" });
  };

  return (
    <ConfirmDialog
      trigger={<Button variant="danger">{t("title")}</Button>}
      title={t("confirmTitle")}
      consequence={t("confirmBody")}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      onConfirm={confirm}
      pending={pending}
    />
  );
}
