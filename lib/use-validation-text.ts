"use client";

import { useTranslations } from "next-intl";
import { readValidationMessage } from "@/lib/validation";

/**
 * Turns the message a schema produced (a catalog key plus its values, as JSON) into text in the
 * person's language. Anything that is not such a message becomes the generic "invalid".
 */
export function useValidationText() {
  const t = useTranslations("validation");
  return (message: string | undefined): string | undefined => {
    if (message === undefined) {
      return undefined;
    }
    const { key, values } = readValidationMessage(message);
    return t(key as never, values as never);
  };
}
