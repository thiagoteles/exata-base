import { track } from "./analytics";
import type { EventCatalog } from "./analytics-events";

// Compiled by the typecheck only: each expected error proves the catalog refuses a wrong call.
track("checkout_started", { interval: "monthly", source: "plans" });
track("signup_completed");

// @ts-expect-error an event that is not in the catalog
track("checkout");
// @ts-expect-error a property the event does not declare
track("checkout_started", { interval: "monthly", plan: "x" });
// @ts-expect-error an event with properties needs them
track("payment_confirmed");

// @ts-expect-error a property named after personal data cannot be declared
export type WithEmail = EventCatalog<{ lead: { email: string } }>;
// @ts-expect-error nor a CPF
export type WithCpf = EventCatalog<{ lead: { cpf: string } }>;
