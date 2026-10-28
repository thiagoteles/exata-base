import type { ComponentType } from "react";
import type { Plan } from "@/lib/billing/service";

/*
 * The product's own offer on the plan page: its plans side by side, what the person uses of the
 * free one, its guarantees. When set, the plan page draws it as a section keyed "offers" and drops
 * its own "see plans" link, since the offer already shows them. The product owns this file; the
 * base ships it empty and the plan page keeps its record and link.
 */

export type PlanOffersProps = {
  /** The person's plan as read now, or null when they never had one. */
  plan: Plan | null;
  userId: string;
};

export const productPlanOffers: ComponentType<PlanOffersProps> | null = null;
