import { billingInterval } from "@/lib/db/schema/billing";
import { z } from "@/lib/validation";

const sourceShape = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);

/** Where an offer was seen, from an address a person arrived by: its name, or the plans page itself when it is not one. */
export const sourceOf = (value: string | string[] | undefined): string => {
  const parsed = sourceShape.safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : "plans";
};

export const checkoutSchema = z.object({
  interval: z.enum(billingInterval.enumValues),
  /** The currency the person was shown, checked against what the product offers before it is used. */
  currency: z
    .string()
    .regex(/^[a-z]{3}$/)
    .optional(),
  /** The screen or block that showed the offer, a short lowercase name. */
  source: sourceShape.default("plans"),
});
export const cancellationSchema = z.object({ cancel: z.boolean() });
