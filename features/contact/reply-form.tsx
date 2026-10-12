"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { useToast } from "@/components/ui/use-toast";
import { useErrorText } from "@/lib/use-error-text";
import { useValidationText } from "@/lib/use-validation-text";
import { answerContact } from "./actions";
import { replySchema } from "./schema";

/** Answers a message by e-mail. The answer is sent before it is recorded, and it can be given once. */
export function ReplyForm({ id, email }: { id: string; email: string }) {
  const t = useTranslations("record");
  const text = useValidationText();
  const describe = useErrorText();
  const notify = useToast();
  const router = useRouter();
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const form = useForm<{ id: string; body: string }>({
    resolver: zodResolver(replySchema),
    defaultValues: { id, body: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await answerContact(values);
    if (result?.data === undefined) {
      setFailure(describe(result?.serverError) ?? t("failed"));
      return;
    }
    notify({ title: t("sent"), tone: "success" });
    router.refresh();
  });

  return (
    <form onSubmit={submit} noValidate className="flex max-w-2xl flex-col gap-4">
      <Field
        label={t("replyLabel")}
        help={t("replyHelp", { email })}
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
        {t("send")}
      </Button>
    </form>
  );
}
