import { billingInterval } from "@/lib/db/schema/billing";
import { z } from "@/lib/validation";

export const checkoutSchema = z.object({ interval: z.enum(billingInterval.enumValues) });
export const cancellationSchema = z.object({ cancel: z.boolean() });
