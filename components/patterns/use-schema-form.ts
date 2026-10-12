"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type DefaultValues, type FieldValues, useForm } from "react-hook-form";
import type { z } from "@/lib/validation";

/**
 * A form checked by the same schema the server action uses. The values handed to submit are the
 * text as typed, not the schema's output: the action validates again, and a schema that turns
 * `dd/mm/aaaa` into an ISO date, or a masked CPF into digits, would refuse its own output.
 */
export function useSchemaForm<Values extends FieldValues>(
  schema: z.ZodType<unknown, Values>,
  defaultValues: DefaultValues<Values>,
) {
  return useForm<Values>({
    resolver: zodResolver(schema as never, undefined, { raw: true }) as never,
    defaultValues,
  });
}
