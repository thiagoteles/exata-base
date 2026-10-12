"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormSelectField, FormTextAreaField } from "@/components/patterns/form-fields";
import { FormTextField } from "@/components/patterns/form-text-field";
import { useSchemaForm } from "@/components/patterns/use-schema-form";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { contactSubjects } from "@/lib/contact/options";
import { rememberOption } from "@/lib/preferences/actions";
import { useErrorText } from "@/lib/use-error-text";
import { sendContact } from "./actions";
import { contactSchema } from "./schema";
import { type Draft, useDraft } from "./use-draft";

type ContactValues = {
  name: string;
  email: string;
  subject: (typeof contactSubjects)[number] | "";
  body: string;
};

type ContactFormProps = {
  /** Set when a person is signed in: their name and e-mail arrive filled in, and the e-mail is theirs. */
  signedIn: { name: string; email: string } | null;
  /** What the signed-in person had started writing, saved in their account. */
  draft: Draft | null;
};

export function ContactForm({ signedIn, draft }: ContactFormProps) {
  const t = useTranslations("contact");
  const describe = useErrorText();
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [sent, setSent] = useState(false);
  const form = useSchemaForm<ContactValues>(contactSchema, {
    name: signedIn?.name ?? "",
    email: signedIn?.email ?? "",
    subject: (draft?.subject ?? "") as ContactValues["subject"],
    body: draft?.body ?? "",
  });
  const clearDraft = useDraft(form as never, signedIn !== null, (next) =>
    rememberOption({ key: "contactDraft", value: next }),
  );

  const submit = form.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await sendContact(values as never);
    if (result?.data !== undefined) {
      clearDraft();
      setSent(true);
      return;
    }
    setFailure(describe(result?.serverError));
  });

  if (sent) {
    return (
      <Panel className="flex flex-col items-start gap-4">
        <Stamp tone="success">{t("sentTitle")}</Stamp>
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
      <FormSelectField
        control={form.control}
        name="subject"
        label={t("subject")}
        options={subjectOptions}
        placeholder={t("subjectPlaceholder")}
      />
      <FormTextAreaField
        control={form.control}
        name="body"
        label={t("message")}
        help={t("messageHelp")}
      />
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
