import type { StampTone } from "@/components/ui/stamp";
import type { Plan } from "@/lib/billing/service";

export type PlanState = "free" | "active" | "pastDue" | "endsSoon" | "ended";

/** The one word that says where a plan stands. A canceled plan that still runs says it ends. */
export function planState(plan: Plan | null): PlanState {
  if (plan === null || plan.tier === "free") {
    return plan?.status === "canceled" ? "ended" : "free";
  }
  if (plan.status === "past_due") {
    return "pastDue";
  }
  return plan.cancelAtPeriodEnd ? "endsSoon" : "active";
}

export const planStateTone: Record<PlanState, StampTone> = {
  free: "neutral",
  active: "done",
  pastDue: "attention",
  endsSoon: "attention",
  ended: "neutral",
};
