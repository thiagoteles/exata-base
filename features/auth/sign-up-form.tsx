"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextField } from "@/components/patterns/form-text-field";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/use-error-text";
import { signUp } from "./actions";
import { AuthCard } from "./auth-card";
import { signUpSchema } from "./schemas";

type SignUpValues = { name: string; email: string; password: string };

type SignUpFormProps = {
  /** From an invite: the e-mail is fixed, because the invite is for that address. */
  invitedEmail?: string | undefined;
};

export function SignUpForm({ invitedEmail }: SignUpFormProps) {
  const t = useTranslations("auth");
  const describe = useErrorText();
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [sentTo, setSentTo] = useState<string | undefined>(undefined);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: invitedEmail ?? "", password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await signUp(values);
    if (result?.data !== undefined) {
      setSentTo(result.data.email);
      return;
    }
    setFailure(describe(result?.serverError));
  });

  if (sentTo !== undefined) {
    return (
      <AuthCard title={t("checkEmail.title")}>
        <p role="status" className="text-body text-ink">
          {t("checkEmail.body", { email: sentTo })}
        </p>
        <Link href="/sign-in" className="text-body-small text-brand-ink underline">
          {t("checkEmail.back")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("signUp.title")}
      subtitle={invitedEmail === undefined ? t("signUp.subtitle") : t("signUp.inviteNotice")}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <FormTextField form={form} name="name" label={t("signUp.name")} autoComplete="name" />
        <FormTextField
          form={form}
          name="email"
          label={t("signUp.email")}
          type="email"
          autoComplete="email"
          readOnly={invitedEmail !== undefined}
        />
        <FormTextField
          form={form}
          name="password"
          label={t("signUp.password")}
          help={t("signUp.passwordHelp")}
          type="password"
          autoComplete="new-password"
        />
        {failure === undefined ? null : (
          <p role="alert" className="text-body text-danger-ink">
            {failure}
          </p>
        )}
        <Button type="submit" loading={form.formState.isSubmitting}>
          {t("signUp.submit")}
        </Button>
      </form>
      <p className="text-body-small text-ink-muted">
        {t("signUp.hasAccount")}{" "}
        <Link href="/sign-in" className="text-brand-ink underline">
          {t("signUp.signIn")}
        </Link>
      </p>
    </AuthCard>
  );
}
