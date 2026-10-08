"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import {
  confirmWizard,
  findAddress,
  validateAddress,
  validateData,
  validateValue,
} from "./wizard-actions";
import {
  type StepName,
  stepNames,
  stepSchemas,
  type WizardInput,
  type WizardOutput,
} from "./wizard-schema";

const empty: WizardInput = {
  name: "",
  cpf: "",
  birth: "",
  cep: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
  amount: "",
};

const fieldsOf: Record<StepName, readonly (keyof WizardInput)[]> = {
  data: ["name", "cpf", "birth"],
  address: ["cep", "street", "number", "district", "city", "state"],
  value: ["amount"],
};

const validators = { data: validateData, address: validateAddress, value: validateValue } as const;

/*
 * The wizard's flow. Each step is checked in the browser with its schema, for instant feedback,
 * and then on the server with the same schema in the real action. The last call checks every
 * step together and stores nothing.
 */
export function useWizard() {
  const t = useTranslations("catalog.wizard");
  const [index, setIndex] = useState(0);
  const step = stepNames[index] ?? "data";
  // Only the fields of the current step are checked; the resolver is read again on every render.
  const resolver: Resolver<WizardInput> = (values, context, options) =>
    zodResolver(stepSchemas[step])(values, context, options as never) as never;
  const form = useForm<WizardInput>({ defaultValues: empty, mode: "onTouched", resolver });
  const [review, setReview] = useState<WizardOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [cepHelp, setCepHelp] = useState<string | undefined>(undefined);

  const showErrors = (errors: Record<string, string[] | undefined>) => {
    for (const [field, messages] of Object.entries(errors)) {
      const message = messages?.[0];
      if (message !== undefined) {
        form.setError(field as keyof WizardInput, { message });
      }
    }
  };

  const checkStep = async (): Promise<boolean> => {
    if (!(await form.trigger([...fieldsOf[step]]))) {
      return false;
    }
    const values = Object.fromEntries(
      fieldsOf[step].map((field) => [field, form.getValues(field)]),
    );
    const remote = await validators[step](values as never);
    if (remote?.validationErrors !== undefined) {
      showErrors(
        (remote.validationErrors as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {},
      );
      return false;
    }
    if (remote?.serverError !== undefined) {
      setNotice(t("serverError"));
      return false;
    }
    return true;
  };

  const work = async (task: () => Promise<void>) => {
    setBusy(true);
    setNotice(undefined);
    await task();
    setBusy(false);
  };

  const next = () =>
    work(async () => {
      if (await checkStep()) {
        setIndex((current) => current + 1);
      }
    });

  const confirm = () =>
    work(async () => {
      if (!(await checkStep())) {
        return;
      }
      const result = await confirmWizard(form.getValues());
      if (result?.data === undefined) {
        setNotice(t("serverError"));
        return;
      }
      setReview(result.data.checked);
    });

  const back = () => {
    setReview(null);
    setIndex((current) => Math.max(0, current - 1));
  };

  const searchCep = () =>
    work(async () => {
      setCepHelp(undefined);
      const found = (await findAddress({ cep: form.getValues("cep") }))?.data;
      if (found?.status === "found") {
        form.setValue("street", found.address.street);
        form.setValue("district", found.address.district);
        form.setValue("city", found.address.city);
        form.setValue("state", found.address.state);
        return;
      }
      setCepHelp(found?.status === "not_found" ? t("cepNotFound") : t("cepUnavailable"));
    });

  return { form, index, step, review, busy, notice, cepHelp, next, confirm, back, searchCep };
}
