"use client";

import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";
import { Combobox } from "@/components/ui/combobox";
import { Field, TextArea } from "@/components/ui/field";
import { MaskedInput } from "@/components/ui/masked-input";
import { type Option, Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useValidationText } from "@/lib/use-validation-text";

/*
 * The fields a form is made of, beside the plain text one: a masked value (CPF, phone, CEP, date,
 * money), a choice from a list, a choice searched in a long list, a long text and an on-off setting. Each is wired to react-hook-form
 * and shows its error as text from the catalog, so a feature only names the field and its label.
 */

type FieldProps<Values extends FieldValues> = {
  control: Control<Values>;
  name: Path<Values>;
  label: string;
  help?: string | undefined;
};

export function FormMaskedField<Values extends FieldValues>({
  control,
  name,
  label,
  help,
  mask,
  prefix,
}: FieldProps<Values> & {
  /** Formats as it is typed; the schema decides whether the value is valid. */
  mask: (value: string) => string;
  /** A fixed mark before the value, such as the currency symbol. */
  prefix?: string;
}) {
  const text = useValidationText();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} help={help} error={text(fieldState.error?.message)}>
          {(aria) => (
            <MaskedInput
              {...aria}
              name={field.name}
              mask={mask}
              value={String(field.value ?? "")}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              {...(prefix === undefined ? {} : { prefix })}
            />
          )}
        </Field>
      )}
    />
  );
}

export function FormSelectField<Values extends FieldValues>({
  control,
  name,
  label,
  help,
  options,
  placeholder,
}: FieldProps<Values> & { options: readonly Option[]; placeholder: string }) {
  const text = useValidationText();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} help={help} error={text(fieldState.error?.message)}>
          {(aria) => (
            <Select
              {...aria}
              options={options}
              value={String(field.value ?? "")}
              onValueChange={field.onChange}
              placeholder={placeholder}
            />
          )}
        </Field>
      )}
    />
  );
}

/** A choice from a list too long to scroll, such as the people on file; typing narrows it. */
export function FormComboboxField<Values extends FieldValues>({
  control,
  name,
  label,
  help,
  options,
  placeholder,
}: FieldProps<Values> & { options: readonly Option[]; placeholder: string }) {
  const text = useValidationText();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} help={help} error={text(fieldState.error?.message)}>
          {(aria) => (
            <Combobox
              {...aria}
              options={options}
              value={String(field.value ?? "")}
              onValueChange={field.onChange}
              placeholder={placeholder}
            />
          )}
        </Field>
      )}
    />
  );
}

export function FormTextAreaField<Values extends FieldValues>({
  control,
  name,
  label,
  help,
  rows = 6,
}: FieldProps<Values> & { rows?: number }) {
  const text = useValidationText();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} help={help} error={text(fieldState.error?.message)}>
          {(aria) => (
            <TextArea {...aria} {...field} value={String(field.value ?? "")} rows={rows} />
          )}
        </Field>
      )}
    />
  );
}

export function FormSwitchField<Values extends FieldValues>({
  control,
  name,
  label,
  help,
}: FieldProps<Values>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Switch
          label={label}
          description={help}
          checked={field.value === true}
          onCheckedChange={field.onChange}
        />
      )}
    />
  );
}
