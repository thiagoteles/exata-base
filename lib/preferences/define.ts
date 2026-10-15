import type { z } from "@/lib/validation";

/* What one preference declares, for the base's registry and the product's alike. */

export type PreferenceDefinition<T> = {
  schema: z.ZodType<T>;
  fallback: T;
  /**
   * Kept in the browser's own storage while the person is a visitor, and never in a cookie, which
   * rides every request and holds 4 KB: for what is too big for that, such as a draft. It is saved to
   * the account when they sign in (see `claimVisitorValues`). The schema is its size limit.
   */
  browser?: true;
  /** A cookie that something other than the registry reads. `encode` returning null clears it. */
  cookie?: { name: string; encode: (value: T) => string | null; decode: (raw: string) => unknown };
};

export const definePreference = <T>(definition: PreferenceDefinition<T>): PreferenceDefinition<T> =>
  definition;
