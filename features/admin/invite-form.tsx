"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextField } from "@/components/patterns/form-text-field";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { userRole } from "@/lib/db/schema/users";
import { inviteUser } from "./actions";
import { inviteSchema } from "./schema";
import { useRun } from "./use-run";

type Values = { email: string; role: (typeof userRole.enumValues)[number] };

/** Invites an address. The e-mail goes out at once; if it cannot, no invite is left behind. */
export function InviteForm() {
  const t = useTranslations("admin.invites.form");
  const roles = useTranslations("admin.roles");
  const { run, pending } = useRun(t("failed"));
  const [role, setRole] = useState<Values["role"]>("staff");
  const form = useForm<Values>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "staff" },
  });
  const submit = form.handleSubmit(async (values) => {
    if (await run(() => inviteUser(values), t("sent"))) {
      form.reset({ email: "", role });
    }
  });
  return (
    <form
      onSubmit={submit}
      noValidate
      className="mb-8 grid gap-4 md:grid-cols-[1fr_16rem_auto] md:items-end"
    >
      <FormTextField form={form} name="email" label={t("email")} type="email" autoComplete="off" />
      <Field label={t("role")}>
        {(control) => (
          <Select
            {...control}
            options={userRole.enumValues.map((option) => ({ value: option, label: roles(option) }))}
            value={role}
            onValueChange={(next) => {
              setRole(next as Values["role"]);
              form.setValue("role", next as Values["role"]);
            }}
            placeholder={t("role")}
          />
        )}
      </Field>
      <Button type="submit" loading={pending}>
        {t("send")}
      </Button>
    </form>
  );
}
