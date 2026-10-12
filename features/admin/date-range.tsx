"use client";

import { useTranslations } from "next-intl";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { Field, Input } from "@/components/ui/field";

const parsers = { from: parseAsString, to: parseAsString, page: parseAsInteger };

/** Two calendar days written to the address, so the audit list can be shared and reloaded. */
export function DateRange() {
  const t = useTranslations("admin.audit");
  const [{ from, to }, setParams] = useQueryStates(parsers, { shallow: false });
  return (
    <div className="flex gap-4">
      <Field label={t("from")}>
        {(control) => (
          <Input
            {...control}
            type="date"
            value={from ?? ""}
            onChange={(event) => setParams({ from: event.target.value || null, page: null })}
          />
        )}
      </Field>
      <Field label={t("to")}>
        {(control) => (
          <Input
            {...control}
            type="date"
            value={to ?? ""}
            onChange={(event) => setParams({ to: event.target.value || null, page: null })}
          />
        )}
      </Field>
    </div>
  );
}
