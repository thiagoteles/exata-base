"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { FormTextField } from "@/components/patterns/form-text-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { giveCourtesy, takeCourtesyBack } from "./actions";
import { courtesySchema } from "./schema";
import { useRun } from "./use-run";

/** Gives the paid plan as a gift. The reason is required and goes to the audit log. */
export function GrantCourtesy({ id }: { id: string }) {
  const t = useTranslations("admin.user");
  const { run, pending } = useRun(t("failed"));
  const form = useForm<{ id: string; reason: string }>({
    resolver: zodResolver(courtesySchema),
    defaultValues: { id, reason: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    if (await run(() => giveCourtesy(values), t("courtesy.granted"))) {
      form.reset({ id, reason: "" });
    }
  });
  return (
    <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-4">
      <FormTextField
        form={form}
        name="reason"
        label={t("courtesy.reason")}
        help={t("courtesy.help")}
      />
      <Button type="submit" variant="secondary" loading={pending} className="self-start">
        {t("courtesy.grant")}
      </Button>
    </form>
  );
}

export function RevokeCourtesy({ id }: { id: string }) {
  const t = useTranslations("admin.user.courtesy");
  const failed = useTranslations("admin.user");
  const { run, pending } = useRun(failed("failed"));
  return (
    <ConfirmDialog
      trigger={<Button variant="secondary">{t("revoke")}</Button>}
      title={t("revokeTitle")}
      consequence={t("revokeBody")}
      confirmLabel={t("revoke")}
      cancelLabel={t("cancel")}
      onConfirm={() => run(() => takeCourtesyBack({ id }), t("revoked"))}
      pending={pending}
    />
  );
}
