"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type SyntheticEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { ErrorBody } from "@/lib/errors";

type UploadDemoProps = { maxMb: number; types: string };

/** Sends one file to the upload route and refreshes the list, saying exactly what went wrong. */
export function UploadDemo({ maxMb, types }: UploadDemoProps) {
  const t = useTranslations("catalog.files");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    const response = await fetch("/catalog/upload", { method: "POST", body: new FormData(form) });
    setBusy(false);
    if (response.ok) {
      form.reset();
      setMessage({ ok: true, text: t("sent") });
      router.refresh();
      return;
    }
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    const key = body?.error.key;
    setMessage({
      ok: false,
      text: key === undefined ? t("genericError") : errors(key as never, { maxMb } as never),
    });
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <Field
        label={t("choose")}
        help={t("limits", { maxMb, types })}
        {...(message?.ok === false ? { error: message.text } : {})}
      >
        {(control) => <Input {...control} name="file" type="file" required />}
      </Field>
      <Button type="submit" loading={busy} className="self-start">
        {t("send")}
      </Button>
      {message?.ok ? (
        <p role="status" className="text-body text-success-ink">
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
