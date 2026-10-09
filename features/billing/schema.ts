import { billingInterval } from "@/lib/db/schema/billing";
import { z } from "@/lib/validation";

export const checkoutSchema = z.object({
  interval: z.enum(billingInterval.enumValues),
  /** The currency the person was shown, checked against what the product offers before it is used. */
  currency: z
    .string()
    .regex(/^[a-z]{3}$/)
    .optional(),
});
export const cancellationSchema = z.object({ cancel: z.boolean() });
