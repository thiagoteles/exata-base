"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  FormComboboxField,
  FormMaskedField,
  FormSelectField,
  FormTextAreaField,
} from "@/components/patterns/form-fields";
import { FormTextField } from "@/components/patterns/form-text-field";
import { UnsavedDialog } from "@/components/patterns/unsaved-dialog";
import { useSchemaForm } from "@/components/patterns/use-schema-form";
import { useUnsavedGuard } from "@/components/patterns/use-unsaved-guard";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/styles";
import { maskDate } from "@/lib/masks";
import { samplePartStatuses } from "@/lib/sample-parts/options";
import { useErrorText } from "@/lib/use-error-text";
import { addSamplePart, changeSamplePart } from "./actions";
import { samplePartHref } from "./presentation";
import { type SamplePartFormInput, samplePartSchema } from "./schema";

type SamplePartFormProps = {
  /** Set when editing: the record and the version the form was opened with. */
  editing?: { id: string; seen: string };
  initial: SamplePartFormInput;
  /** The account's sample items, one of which the record is filed under. */
  parents: { id: string; name: string }[];
};

/** Puts a record on file, or changes one; a change made over an older version is refused. */
export function SamplePartForm({ editing, initial, parents }: SamplePartFormProps) {
  const t = useTranslations("sampleParts");
  const describe = useErrorText();
  const router = useRouter();
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const form = useSchemaForm<SamplePartFormInput>(samplePartSchema, initial);
  const { control } = form;
  const guard = useUnsavedGuard(form.formState.isDirty && !form.formState.isSubmitSuccessful);

  const submit = form.handleSubmit(async (values) => {
    setFailure(undefined);
    const result =
      editing === undefined
        ? await addSamplePart(values)
        : await changeSamplePart({ ...editing, item: values });
    if (result?.data === undefined) {
      setFailure(describe(result?.serverError) ?? t("form.failed"));
      return;
    }
    router.push(samplePartHref(result.data.id));
  });

  const cancel = (editing === undefined ? "/sample-parts" : samplePartHref(editing.id)) as Route;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 md:grid-cols-6">
      <div className="md:col-span-6">
        <FormComboboxField
          control={control}
          name="sampleItemId"
          label={t("form.parent")}
          placeholder={t("form.parentPlaceholder")}
          options={parents.map((parent) => ({ value: parent.id, label: parent.name }))}
        />
      </div>
      <div className="md:col-span-4">
        <FormTextField form={form} name="name" label={t("form.name")} />
      </div>
      <div className="md:col-span-2">
        <FormTextField form={form} name="code" label={t("form.code")} help={t("form.codeHelp")} />
      </div>
      <div className="md:col-span-3">
        <FormSelectField
          control={control}
          name="status"
          label={t("form.status")}
          placeholder={t("form.status")}
          options={samplePartStatuses.map((value) => ({ value, label: t(`statuses.${value}`) }))}
        />
      </div>
      <div className="md:col-span-3">
        <FormMaskedField
          control={control}
          name="dueDate"
          label={t("form.dueDate")}
          mask={maskDate}
        />
      </div>
      <div className="md:col-span-6">
        <FormTextAreaField control={control} name="notes" label={t("form.notes")} rows={4} />
      </div>
      {failure === undefined ? null : (
        <p role="alert" className="text-body text-danger-ink md:col-span-6">
          {failure}
        </p>
      )}
      <div className="flex gap-3 max-sm:flex-col-reverse md:col-span-6">
        <Link href={cancel} className={buttonClasses("secondary")}>
          {t("form.cancel")}
        </Link>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {editing === undefined ? t("form.create") : t("form.save")}
        </Button>
      </div>
      <UnsavedDialog open={guard.isAsking} onLeave={guard.leave} onStay={guard.stay} />
    </form>
  );
}
