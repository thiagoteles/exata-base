"use client";

import { useTranslations } from "next-intl";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";

const parsers = { from: parseAsString, to: parseAsString, page: parseAsInteger };

/**
 * Two calendar days written to the address, so the audit list can be shared and reloaded. Each is
 * typed as dd/mm/aaaa or picked from a month; a day half typed leaves the address alone.
 */
export function DateRange({ today }: { today: string }) {
  const t = useTranslations("admin.audit");
  const [{ from, to }, setParams] = useQueryStates(parsers, { shallow: false });
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Field label={t("from")} className="sm:w-52">
        {(control) => (
          <DatePicker
            {...control}
            value={from ?? ""}
            today={today}
            onValueChange={(value) => setParams({ from: value || null, page: null })}
          />
        )}
      </Field>
      <Field label={t("to")} className="sm:w-52">
        {(control) => (
          <DatePicker
            {...control}
            value={to ?? ""}
            today={today}
            onValueChange={(value) => setParams({ to: value || null, page: null })}
          />
        )}
      </Field>
    </div>
  );
}
