"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useErrorText } from "@/lib/use-error-text";
import { removeSamplePart } from "./actions";

/** Deletes a record after the dialog says what goes, then returns to the list. */
export function DeleteSamplePart({ id, name }: { id: string; name: string }) {
  const t = useTranslations("sampleParts");
  const router = useRouter();
  const notify = useToast();
  const describe = useErrorText();
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    const result = await removeSamplePart({ id });
    setPending(false);
    if (result?.data === undefined) {
      notify({ title: describe(result?.serverError) ?? t("remove.failed"), tone: "danger" });
      return;
    }
    notify({ title: t("remove.done", { name }), tone: "success" });
    router.push("/sample-parts");
  };

  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" tone="danger">
          {t("delete")}
        </Button>
      }
      title={t("remove.title", { name })}
      consequence={t("remove.consequence")}
      confirmLabel={t("remove.confirm")}
      cancelLabel={t("remove.cancel")}
      onConfirm={confirm}
      pending={pending}
    />
  );
}
