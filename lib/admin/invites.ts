import { and, count, desc, eq, gt, isNotNull, isNull, lte, type SQL } from "drizzle-orm";
import type { Actor } from "@/lib/accounts/actor";
import { createInvite, revokeInvite } from "@/lib/accounts/invites";
import type { Role } from "@/lib/accounts/roles";
import type { Database } from "@/lib/db/database";
import { invites } from "@/lib/db/schema/invites";
import { users } from "@/lib/db/schema/users";
import { contains } from "@/lib/db/search";
import { DomainError } from "@/lib/errors";
import { type PageWindow, pageWindow } from "@/lib/list-params";
import { type AdminViewer, assertAdmin } from "./guard";

/* The invite list and the two writes the admin area adds to the invite rules. */

export const inviteStatuses = ["pending", "accepted", "expired", "revoked"] as const;
export type InviteStatus = (typeof inviteStatuses)[number];

export type InviteRow = typeof invites.$inferSelect & { status: InviteStatus };

/** Accepted and revoked win over the clock: an invite used or withdrawn is never "expired". */
export function inviteStatus(
  invite: Pick<typeof invites.$inferSelect, "acceptedAt" | "revokedAt" | "expiresAt">,
  now: Date,
): InviteStatus {
  if (invite.acceptedAt !== null) {
    return "accepted";
  }
  if (invite.revokedAt !== null) {
    return "revoked";
  }
  return invite.expiresAt <= now ? "expired" : "pending";
}

function statusCondition(status: InviteStatus, now: Date): SQL | undefined {
  switch (status) {
    case "accepted":
      return isNotNull(invites.acceptedAt);
    case "revoked":
      return and(isNull(invites.acceptedAt), isNotNull(invites.revokedAt));
    case "expired":
      return and(
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
        lte(invites.expiresAt, now),
      );
    case "pending":
      return and(isNull(invites.acceptedAt), isNull(invites.revokedAt), gt(invites.expiresAt, now));
    default:
      return status satisfies never;
  }
}

export type InviteQuery = { q: string; status: InviteStatus | null; page: number };

export async function queryInvites(
  db: Database,
  viewer: AdminViewer,
  { q, status, page }: InviteQuery,
  now: Date,
): Promise<{ rows: InviteRow[]; window: PageWindow }> {
  assertAdmin(viewer);
  const term = q.trim();
  const where = and(
    status === null ? undefined : statusCondition(status, now),
    term === "" ? undefined : contains(invites.email, term),
  );
  const [{ total = 0 } = {}] = await db.select({ total: count() }).from(invites).where(where);
  const window = pageWindow(page, total);
  const rows = await db
    .select()
    .from(invites)
    .where(where)
    .orderBy(desc(invites.createdAt), desc(invites.id))
    .limit(window.to === 0 ? 1 : window.to - window.from + 1)
    .offset(window.offset);
  return {
    rows: window.total === 0 ? [] : rows.map((row) => ({ ...row, status: inviteStatus(row, now) })),
    window,
  };
}

/**
 * Invites an address and sends the link. An address that already has an account is refused, since
 * an invite only acts at sign-up. If the e-mail does not go out the invite is withdrawn, so the
 * list never shows an invite nobody received.
 */
export async function inviteByEmail(
  db: Database,
  actor: Actor,
  input: { email: string; role: Role },
  {
    send,
    now,
  }: { send: (invite: { token: string; expiresAt: Date }) => Promise<boolean>; now: Date },
): Promise<void> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()));
  if (existing !== undefined) {
    throw new DomainError(409, "emailTaken");
  }
  const invite = await createInvite(db, actor, input, now);
  if (!(await send(invite))) {
    await revokeInvite(db, actor, invite.id, now);
    throw new DomainError(409, "emailNotSent");
  }
}
