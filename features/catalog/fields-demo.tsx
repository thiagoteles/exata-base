"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field, Input, TextArea } from "@/components/ui/field";
import { MaskedInput } from "@/components/ui/masked-input";
import { maskCep, maskCpf, maskDate, maskMoney, maskPhone } from "@/lib/masks";

export function FieldsDemo() {
  const t = useTranslations("catalog.fields");
  const [masked, setMasked] = useState({ cpf: "", phone: "", cep: "", date: "", money: "" });
  const set = (key: keyof typeof masked) => (value: string) =>
    setMasked((current) => ({ ...current, [key]: value }));
  return (
    <div className="grid max-w-3xl gap-6 md:grid-cols-2">
      <Field label={t("name")} help={t("nameHelp")}>
        {(control) => <Input {...control} autoComplete="off" />}
      </Field>
      <Field label={t("email")} error={t("emailError")}>
        {(control) => <Input {...control} type="email" defaultValue="ana@" />}
      </Field>
      <Field label={t("cpf")}>
        {(control) => (
          <MaskedInput {...control} mask={maskCpf} value={masked.cpf} onValueChange={set("cpf")} />
        )}
      </Field>
      <Field label={t("phone")}>
        {(control) => (
          <MaskedInput
            {...control}
            mask={maskPhone}
            value={masked.phone}
            onValueChange={set("phone")}
            inputMode="tel"
          />
        )}
      </Field>
      <Field label={t("cep")}>
        {(control) => (
          <MaskedInput {...control} mask={maskCep} value={masked.cep} onValueChange={set("cep")} />
        )}
      </Field>
      <Field label={t("date")}>
        {(control) => (
          <MaskedInput
            {...control}
            mask={maskDate}
            value={masked.date}
            onValueChange={set("date")}
          />
        )}
      </Field>
      <Field label={t("money")}>
        {(control) => (
          <MaskedInput
            {...control}
            mask={maskMoney}
            value={masked.money}
            onValueChange={set("money")}
            prefix="R$"
          />
        )}
      </Field>
      <Field label={t("message")} className="md:col-span-2">
        {(control) => <TextArea {...control} />}
      </Field>
    </div>
  );
}
