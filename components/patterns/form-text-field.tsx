"use client";

import type { ComponentProps } from "react";
import { type FieldValues, type Path, type UseFormReturn, useFormState } from "react-hook-form";
import { Field, Input } from "@/components/ui/field";
import { useValidationText } from "@/lib/use-validation-text";

type FormTextFieldProps<Values extends FieldValues> = {
  form: UseFormReturn<Values>;
  name: Path<Values>;
  label: string;
  help?: string | undefined;
} & Pick<ComponentProps<"input">, "type" | "autoComplete" | "readOnly">;

/** A text field wired to a react-hook-form form, showing its error as text from the catalog. */
export function FormTextField<Values extends FieldValues>({
  form,
  name,
  label,
  help,
  ...input
}: FormTextFieldProps<Values>) {
  const text = useValidationText();
  // The form only tells the component that read `formState` about a change. This field reads its own
  // error with useFormState, so it re-renders when its error appears or goes away.
  const { errors } = useFormState({ control: form.control, name });
  const message = errors[name]?.message;
  return (
    <Field
      label={label}
      help={help}
      error={text(typeof message === "string" ? message : undefined)}
    >
      {(control) => <Input {...control} {...input} {...form.register(name)} />}
    </Field>
  );
}
