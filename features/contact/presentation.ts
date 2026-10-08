import type { Route } from "next";
import type { StampTone } from "@/components/ui/stamp";
import type { ContactStatus, Scope } from "@/lib/contact/service";

/** A new message asks for attention, one being worked is in progress, an answered one is done. */
export const contactStatusTone: Record<ContactStatus, StampTone> = {
  new: "attention",
  in_progress: "progress",
  answered: "done",
  archived: "neutral",
};

/** The team opens a message in the inbox; a person opens their own under their account. */
export function recordHref(scope: Scope, id: string): Route {
  // Both patterns are real routes; a template string cannot be proved to match one, so it is stated.
  return (scope === "all" ? `/staff/contacts/${id}` : `/account/messages/${id}`) as Route;
}
