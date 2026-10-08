"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormTextField } from "@/components/patterns/form-text-field";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { contactSubjects } from "@/lib/contact/options";
import { useErrorText } from "@/lib/use-error-text";
import { useValidationText } from "@/lib/use-validation-text";
import { sendContact } from "./actions";
import { contactSchema } from "./schema";

type ContactValues = {
  name: string;
  email: string;
  subject: (typeof contactSubjects)[number] | "";
  body: string;
};

type ContactFormProps = {
  /** Set when a person is signed in: their name and e-mail arrive filled in, and the e-mail is theirs. */
  signedIn: { name: string; email: string } | null;
};

export function ContactForm({ signedIn }: ContactFormProps) {
  const t = useTranslations("contact");
  const text = useValidationText();
  const describe = useErrorText();
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [sent, setSent] = useState(false);
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema) as never,
    defaultValues: {
      name: signedIn?.name ?? "",
      email: signedIn?.email ?? "",
      subject: "",
      body: "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await sendContact(values as never);
    if (result?.data !== undefined) {
      setSent(true);
      return;
    }
    setFailure(describe(result?.serverError));
  });

  if (sent) {
    return (
      <Panel className="flex flex-col items-start gap-4">
        <Stamp tone="done">{t("sentTitle")}</Stamp>
        <p role="status" className="text-body text-ink">
          {t("sentBody")}
        </p>
        <Link href="/" className={buttonClasses("secondary")}>
          {t("sentBack")}
        </Link>
      </Panel>
    );
  }

  const subjectOptions = contactSubjects.map((value) => ({ value, label: t(`subjects.${value}`) }));
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {signedIn === null ? null : (
        <p className="text-body-small text-ink-muted">
          {t("signedInAs", { email: signedIn.email })}
        </p>
      )}
      <FormTextField form={form} name="name" label={t("name")} autoComplete="name" />
      {signedIn === null ? (
        <FormTextField
          form={form}
          name="email"
          label={t("email")}
          type="email"
          autoComplete="email"
        />
      ) : null}
      <Controller
        control={form.control}
        name="subject"
        render={({ field, fieldState }) => (
          <Field label={t("subject")} error={text(fieldState.error?.message)}>
            {(aria) => (
              <Select
                {...aria}
                options={subjectOptions}
                value={field.value}
                onValueChange={field.onChange}
                placeholder={t("subjectPlaceholder")}
              />
            )}
          </Field>
        )}
      />
      <Field
        label={t("message")}
        help={t("messageHelp")}
        error={text(form.formState.errors.body?.message)}
      >
        {(aria) => <TextArea {...aria} {...form.register("body")} rows={6} />}
      </Field>
      {failure === undefined ? null : (
        <p role="alert" className="text-body text-danger-ink">
          {failure}
        </p>
      )}
      <Button type="submit" loading={form.formState.isSubmitting} className="self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
