"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SaveBar } from "@/components/patterns/save-bar";
import { UnsavedDialog } from "@/components/patterns/unsaved-dialog";
import { useSaveStatus } from "@/components/patterns/use-save-status";
import { useUnsavedGuard } from "@/components/patterns/use-unsaved-guard";
import { Field, Input } from "@/components/ui/field";

const FAKE_SAVE_MS = 500;
const INITIAL = "Caderno A5";

/** A form that has a save bar, a Saved stamp and a guard against leaving with changes. */
export function SaveDemo() {
  const t = useTranslations("catalog.save");
  const [saved, setSaved] = useState(INITIAL);
  const [value, setValue] = useState(INITIAL);
  const dirty = value !== saved;
  const guard = useUnsavedGuard(dirty);
  const { status, save } = useSaveStatus(dirty, async () => {
    await new Promise((resolve) => setTimeout(resolve, FAKE_SAVE_MS));
    setSaved(value);
    return true;
  });
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Field label={t("name")} help={t("hint")}>
        {(control) => (
          <Input {...control} value={value} onChange={(event) => setValue(event.target.value)} />
        )}
      </Field>
      <Link href="/catalog?from=save" className="text-body text-brand-ink underline">
        {t("link")}
      </Link>
      <SaveBar status={status} onSave={save} onDiscard={() => setValue(saved)} />
      <UnsavedDialog open={guard.isAsking} onLeave={guard.leave} onStay={guard.stay} />
    </div>
  );
}
