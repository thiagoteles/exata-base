"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

const states = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
] as const;

const stateOptions = states.map(([value, label]) => ({ value, label }));

export function PickersDemo() {
  const t = useTranslations("catalog");
  const [status, setStatus] = useState("");
  const [state, setState] = useState("");
  const statusOptions = (["new", "progress", "paid", "refused"] as const).map((value) => ({
    value,
    label: t(`statuses.${value}`),
  }));
  return (
    <div className="grid max-w-3xl gap-6 md:grid-cols-2">
      <Field label={t("pickers.select")}>
        {(control) => (
          <Select
            {...control}
            options={statusOptions}
            value={status}
            onValueChange={setStatus}
            placeholder={t("pickers.selectPlaceholder")}
          />
        )}
      </Field>
      <Field label={t("pickers.combobox")}>
        {(control) => (
          <Combobox
            {...control}
            options={stateOptions}
            value={state}
            onValueChange={setState}
            placeholder={t("pickers.comboboxPlaceholder")}
          />
        )}
      </Field>
    </div>
  );
}
