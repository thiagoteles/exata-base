"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextField } from "@/components/patterns/form-text-field";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/use-error-text";
import { confirmSecondFactor, signIn } from "./actions";
import { AuthCard } from "./auth-card";
import { secondFactorSchema, signInSchema } from "./schemas";

type SignInValues = { email: string; password: string };

export function SignInForm({
  next,
  notice,
}: {
  next: string;
  notice: "verified" | "reset" | null;
}) {
  const t = useTranslations("auth.signIn");
  const second = useTranslations("auth.secondFactor");
  const reset = useTranslations("auth.reset");
  const describe = useErrorText();
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [challenge, setChallenge] = useState(false);
  const [backup, setBackup] = useState(false);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const codeForm = useForm<{ code: string }>({
    resolver: zodResolver(secondFactorSchema.pick({ code: true })),
    defaultValues: { code: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await signIn({ ...values, next });
    if (result?.data?.twoFactor === true) {
      setChallenge(true);
      return;
    }
    if (result?.data?.redirectTo !== undefined) {
      globalThis.location.assign(result.data.redirectTo);
      return;
    }
    setFailure(describe(result?.serverError));
  });

  const submitCode = codeForm.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await confirmSecondFactor({ code: values.code, backup, next });
    if (result?.data !== undefined) {
      globalThis.location.assign(result.data.redirectTo);
      return;
    }
    setFailure(describe(result?.serverError));
  });

  if (challenge) {
    return (
      <AuthCard title={second("title")} subtitle={backup ? second("backupHelp") : second("help")}>
        <form onSubmit={submitCode} noValidate className="flex flex-col gap-5">
          <FormTextField
            form={codeForm}
            name="code"
            label={backup ? second("backup") : second("code")}
            code
            autoComplete="one-time-code"
          />
          {failure === undefined ? null : (
            <p role="alert" className="text-body text-danger-ink">
              {failure}
            </p>
          )}
          <Button type="submit" loading={codeForm.formState.isSubmitting}>
            {second("submit")}
          </Button>
        </form>
        <button
          type="button"
          className="self-start text-body-small text-brand-ink underline"
          onClick={() => {
            setBackup((current) => !current);
            setFailure(undefined);
            codeForm.reset();
          }}
        >
          {backup ? second("useApp") : second("useBackup")}
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      {notice === null ? null : (
        <p role="status" className="text-body text-success-ink">
          {notice === "verified" ? t("verified") : reset("done")}
        </p>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <FormTextField
          form={form}
          name="email"
          label={t("email")}
          type="email"
          autoComplete="email"
        />
        <FormTextField
          form={form}
          name="password"
          label={t("password")}
          type="password"
          autoComplete="current-password"
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
      <div className="flex flex-col gap-2 text-body-small">
        <Link href="/forgot-password" className="text-brand-ink underline">
          {t("forgot")}
        </Link>
        <p className="text-ink-muted">
          {t("noAccount")}{" "}
          <Link href="/sign-up" className="text-brand-ink underline">
            {t("create")}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
