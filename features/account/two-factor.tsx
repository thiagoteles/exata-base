"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextField } from "@/components/patterns/form-text-field";
import { Button } from "@/components/ui/button";
import { emailPalette } from "@/emails/palette";
import { useErrorText } from "@/lib/use-error-text";
import { secondFactorCodeSchema, secondFactorPasswordSchema } from "./schema";
import { beginSecondFactor, finishSecondFactor, turnOffSecondFactor } from "./two-factor-actions";

type Setup = { code: { d: string; size: number }; secret: string; backupCodes: string[] };

/**
 * The authenticator on the account page, shown only when the app signs people in itself.
 * The backup codes are on screen once, between the password and the confirming code.
 */
export function SecondFactorPanel({ enabled }: { enabled: boolean }) {
  const t = useTranslations("account.secondFactor");
  const describe = useErrorText();
  const [on, setOn] = useState(enabled);
  const [setup, setSetup] = useState<Setup | undefined>(undefined);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const passwordForm = useForm<{ password: string }>({
    resolver: zodResolver(secondFactorPasswordSchema),
    defaultValues: { password: "" },
  });
  const codeForm = useForm<{ code: string }>({
    resolver: zodResolver(secondFactorCodeSchema),
    defaultValues: { code: "" },
  });

  const start = passwordForm.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await beginSecondFactor(values);
    if (result?.data === undefined) {
      setFailure(describe(result?.serverError));
      return;
    }
    setSetup(result.data);
    passwordForm.reset();
  });

  const confirm = codeForm.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await finishSecondFactor(values);
    if (result?.data === undefined) {
      setFailure(describe(result?.serverError));
      return;
    }
    setSetup(undefined);
    setOn(true);
    codeForm.reset();
  });

  const turnOff = passwordForm.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await turnOffSecondFactor(values);
    if (result?.data === undefined) {
      setFailure(describe(result?.serverError));
      return;
    }
    setOn(false);
    passwordForm.reset();
  });

  if (setup !== undefined) {
    return (
      <div className="flex max-w-md flex-col gap-5">
        <p className="text-body text-ink">{t("scan")}</p>
        {/* Dark on a light ground, whatever the theme, so a camera can read it. */}
        <div className="w-60 p-2" style={{ backgroundColor: emailPalette.surface }}>
          <svg
            viewBox={`0 0 ${setup.code.size} ${setup.code.size}`}
            role="img"
            aria-label={t("qrAlt")}
            className="w-full"
          >
            <path d={setup.code.d} fill={emailPalette.ink} />
          </svg>
        </div>
        <p className="font-mono text-data text-ink">{setup.secret}</p>
        <div>
          <p className="text-body text-ink">{t("backupOnce")}</p>
          <ul className="mt-2 columns-2 font-mono text-data text-ink">
            {setup.backupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
        <form onSubmit={confirm} noValidate className="flex flex-col gap-4">
          <FormTextField
            form={codeForm}
            name="code"
            label={t("code")}
            code
            autoComplete="one-time-code"
          />
          {failure === undefined ? null : (
            <p role="alert" className="text-body text-danger-ink">
              {failure}
            </p>
          )}
          <Button type="submit" className="self-start" loading={codeForm.formState.isSubmitting}>
            {t("confirm")}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={on ? turnOff : start} noValidate className="flex max-w-md flex-col gap-4">
      <FormTextField
        form={passwordForm}
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
      <Button
        type="submit"
        variant={on ? "secondary" : "primary"}
        className="self-start"
        loading={passwordForm.formState.isSubmitting}
      >
        {on ? t("turnOff") : t("turnOn")}
      </Button>
    </form>
  );
}
