import { env } from "@/lib/env";

/**
 * Whether billing is set up at all: the provider's keys are there. Prices are read from the port
 * separately. Apart from the port because the public layout asks it on every page, and the port
 * holds a cached read, which the framework compiles into every page that imports its module.
 */
export function billingConfigured(): boolean {
  return env.STRIPE_SECRET_KEY !== undefined && env.STRIPE_WEBHOOK_SECRET !== undefined;
}
