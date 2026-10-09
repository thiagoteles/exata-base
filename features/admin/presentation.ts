import type { StampTone } from "@/components/ui/stamp";
import type { InviteStatus } from "@/lib/admin/invites";

/** A pending invite asks for nothing; an accepted one is done; a lapsed or withdrawn one is closed. */
export const inviteTone: Record<InviteStatus, StampTone> = {
  pending: "info",
  accepted: "success",
  expired: "neutral",
  revoked: "danger",
};
