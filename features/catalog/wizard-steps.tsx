"use client";

import { useTranslations } from "next-intl";
import { type Control, Controller, type FieldPath } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { MaskedInput } from "@/components/ui/masked-input";
import { maskCep, maskCpf, maskDate, maskMoney } from "@/lib/masks";
import { useValidationText } from "@/lib/use-validation-text";
import type { WizardInput } from "./wizard-schema";

type StepProps = { control: Control<WizardInput> };

type TextFieldProps = StepProps & {
  name: FieldPath<WizardInput>;
  label: string;
  mask?: (value: string) => string;
  prefix?: string;
  help?: string | undefined;
};

/** One field of the wizard, wired to the form and showing its error as text from the catalog. */
function WizardField({ control, name, label, mask, prefix, help }: TextFieldProps) {
  const text = useValidationText();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={text(fieldState.error?.message)} help={help}>
          {(aria) =>
            mask === undefined ? (
              <Input {...aria} {...field} autoComplete="off" />
            ) : (
              <MaskedInput
                {...aria}
                mask={mask}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                {...(prefix === undefined ? {} : { prefix })}
              />
            )
          }
        </Field>
      )}
    />
  );
}

export function DataStep({ control }: StepProps) {
  const t = useTranslations("catalog.wizard");
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <WizardField control={control} name="name" label={t("name")} />
      </div>
      <WizardField control={control} name="cpf" label={t("cpf")} mask={maskCpf} />
      <WizardField control={control} name="birth" label={t("birth")} mask={maskDate} />
    </div>
  );
}

type AddressStepProps = StepProps & {
  cepHelp: string | undefined;
  onSearchCep: () => void;
  searching: boolean;
  searchLabel: string;
};

export function AddressStep({
  control,
  cepHelp,
  onSearchCep,
  searching,
  searchLabel,
}: AddressStepProps) {
  const t = useTranslations("catalog.wizard");
  return (
    <div className="grid gap-6 md:grid-cols-6">
      <div className="flex items-start gap-3 md:col-span-3">
        <div className="flex-1">
          <WizardField
            control={control}
            name="cep"
            label={t("cep")}
            mask={maskCep}
            help={cepHelp}
          />
        </div>
        <Button variant="secondary" className="mt-9" onClick={onSearchCep} loading={searching}>
          {searchLabel}
        </Button>
      </div>
      <div className="md:col-span-6">
        <WizardField control={control} name="street" label={t("street")} />
      </div>
      <div className="md:col-span-2">
        <WizardField control={control} name="number" label={t("number")} />
      </div>
      <div className="md:col-span-2">
        <WizardField control={control} name="district" label={t("district")} />
      </div>
      <div className="md:col-span-2">
        <WizardField control={control} name="city" label={t("city")} />
      </div>
      <div className="md:col-span-2">
        <WizardField control={control} name="state" label={t("state")} />
      </div>
    </div>
  );
}

export function ValueStep({ control }: StepProps) {
  const t = useTranslations("catalog.wizard");
  return (
    <div className="max-w-xs">
      <WizardField
        control={control}
        name="amount"
        label={t("amount")}
        mask={maskMoney}
        prefix="R$"
      />
    </div>
  );
}
