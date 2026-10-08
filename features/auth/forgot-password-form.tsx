"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextField } from "@/components/patterns/form-text-field";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/use-error-text";
import { forgotPassword } from "./actions";
import { AuthCard } from "./auth-card";
import { forgotPasswordSchema } from "./schemas";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const describe = useErrorText();
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [sent, setSent] = useState(false);
  const form = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await forgotPassword(values);
    if (result?.data !== undefined) {
      setSent(true);
      return;
    }
    setFailure(describe(result?.serverError));
  });

  return (
    <AuthCard
      title={sent ? t("sentTitle") : t("title")}
      {...(sent ? {} : { subtitle: t("subtitle") })}
    >
      {sent ? (
        <p role="status" className="text-body text-ink">
          {t("sentBody")}
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <FormTextField
            form={form}
            name="email"
            label={t("email")}
            type="email"
            autoComplete="email"
          />
          {failure === undefined ? null : (
            <p role="alert" className="text-body text-danger-ink">
              {failure}
            </p>
          )}
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t("submit")}
          </Button>
        </form>
      )}
      <Link href="/sign-in" className="text-body-small text-brand-ink underline">
        {t("back")}
      </Link>
    </AuthCard>
  );
}
