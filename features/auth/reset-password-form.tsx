"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextField } from "@/components/patterns/form-text-field";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/use-error-text";
import { choosePassword } from "./actions";
import { AuthCard } from "./auth-card";
import { resetPasswordSchema } from "./schemas";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset");
  const describe = useErrorText();
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const form = useForm<{ token: string; password: string }>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await choosePassword(values);
    if (result?.data !== undefined) {
      globalThis.location.assign("/sign-in?reset=1");
      return;
    }
    setFailure(describe(result?.serverError));
  });

  return (
    <AuthCard title={t("title")}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <FormTextField
          form={form}
          name="password"
          label={t("password")}
          help={t("passwordHelp")}
          type="password"
          autoComplete="new-password"
        />
        {failure === undefined ? null : (
          <p role="alert" className="text-body text-danger-ink">
            {failure}{" "}
            <Link href="/forgot-password" className="text-brand-ink underline">
              {t("request")}
            </Link>
          </p>
        )}
        <Button type="submit" loading={form.formState.isSubmitting}>
          {t("submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
