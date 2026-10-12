"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { userRole } from "@/lib/db/schema/users";
import { setUserRole } from "./actions";
import { useRun } from "./use-run";

/** Changes a person's role. The last admin cannot be demoted; the server refuses and says so. */
export function RoleControl({ id, role }: { id: string; role: string }) {
  const t = useTranslations("admin.user");
  const roles = useTranslations("admin.roles");
  const { run } = useRun(t("failed"));
  const [value, setValue] = useState(role);

  const change = async (next: string) => {
    const previous = value;
    setValue(next);
    const done = await run(() => setUserRole({ id, role: next as never }), t("role.saved"));
    if (!done) {
      setValue(previous);
    }
  };

  return (
    <Field label={t("role.label")} className="w-full md:w-64">
      {(control) => (
        <Select
          {...control}
          options={userRole.enumValues.map((option) => ({ value: option, label: roles(option) }))}
          value={value}
          onValueChange={change}
          placeholder={t("role.label")}
        />
      )}
    </Field>
  );
}
