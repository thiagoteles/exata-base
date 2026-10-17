"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { userRole } from "@/lib/db/schema/users";
import { setUserRole } from "./actions";
import { useRun } from "./use-run";

/** Changes a person's role. The last admin cannot be demoted; the server refuses and says so. */
type Role = (typeof userRole.enumValues)[number];

export function RoleControl({ id, role, name }: { id: string; role: Role; name: string }) {
  const t = useTranslations("admin.user");
  const roles = useTranslations("admin.roles");
  const { run } = useRun(t("failed"));
  const [value, setValue] = useState<Role>(role);
  // A new role changes what the person may do at once, so it is asked before it is saved.
  const [asked, setAsked] = useState<Role | null>(null);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    if (asked === null) {
      return;
    }
    setPending(true);
    const done = await run(() => setUserRole({ id, role: asked }), t("role.saved"));
    setPending(false);
    if (done) {
      setValue(asked);
    }
    setAsked(null);
  };

  return (
    <>
      <Field label={t("role.label")} className="w-full md:w-64">
        {(control) => (
          <Select
            {...control}
            options={userRole.enumValues.map((option) => ({ value: option, label: roles(option) }))}
            value={value}
            onValueChange={(next) => (next === value ? undefined : setAsked(next as Role))}
            placeholder={t("role.label")}
          />
        )}
      </Field>
      <ConfirmDialog
        open={asked !== null}
        onOpenChange={(open) => (open ? undefined : setAsked(null))}
        title={t("role.confirmTitle")}
        consequence={t("role.confirmBody", {
          name,
          from: roles(value),
          to: asked === null ? "" : roles(asked),
        })}
        confirmLabel={t("role.confirm")}
        cancelLabel={t("role.cancel")}
        onConfirm={confirm}
        pending={pending}
      />
    </>
  );
}
