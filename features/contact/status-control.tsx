"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { contactStatuses } from "@/lib/contact/options";
import { useErrorText } from "@/lib/use-error-text";
import { setContactStatus } from "./actions";

/** The staff changes where a message stands; the change is written in the audit log by the action. */
export function StatusControl({ id, status }: { id: string; status: string }) {
  const t = useTranslations("record");
  const labels = useTranslations("contact.statuses");
  const describe = useErrorText();
  const notify = useToast();
  const router = useRouter();
  const [value, setValue] = useState(status);

  const change = async (next: string) => {
    const previous = value;
    setValue(next);
    const result = await setContactStatus({ id, status: next as never });
    if (result?.data === undefined) {
      setValue(previous);
      notify({ title: t("failed"), description: describe(result?.serverError), tone: "danger" });
      return;
    }
    notify({ title: t("statusSaved"), tone: "success" });
    router.refresh();
  };

  return (
    <Field label={t("changeStatus")} className="w-full md:w-64">
      {(control) => (
        <Select
          {...control}
          options={contactStatuses.map((option) => ({ value: option, label: labels(option) }))}
          value={value}
          onValueChange={change}
          placeholder={t("changeStatus")}
        />
      )}
    </Field>
  );
}
