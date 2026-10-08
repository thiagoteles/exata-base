import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { invites } from "@/lib/db/schema/invites";
import { DomainError } from "@/lib/errors";
import type { Actor } from "./actor";
import { recordStaffWrite } from "./audit";
import type { Role } from "./roles";

/*
 * Only the hash of an invite token is stored. The token itself exists once, in the link that
 * goes out by e-mail, so a database copy cannot be turned into working invite links.
 */

const TOKEN_BYTES = 32;
const DAY_MS = 86_400_000;
const INVITE_LIFETIME_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function createInvite(
  db: Database,
  actor: Actor,
  input: { email: string; role: Role },
  now: Date = new Date(),
): Promise<{ id: string; token: string; expiresAt: Date }> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITE_LIFETIME_DAYS * DAY_MS);
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .insert(invites)
      .values({
        email: input.email.toLowerCase(),
        role: input.role,
        tokenHash: hashToken(token),
        expiresAt,
        invitedBy: actor.id,
        invitedByEmail: actor.email,
      })
      .returning({ id: invites.id });
    if (invite === undefined) {
      throw new Error("invite was not stored");
    }
    await recordStaffWrite(tx, actor, {
      action: "invite.create",
      targetTable: "invites",
      targetId: invite.id,
      details: { role: input.role },
    });
    return { id: invite.id, token, expiresAt };
  });
}

export async function revokeInvite(
  db: Database,
  actor: Actor,
  inviteId: string,
  now: Date = new Date(),
) {
  await db.transaction(async (tx) => {
    const [revoked] = await tx
      .update(invites)
      .set({ revokedAt: now })
      .where(and(eq(invites.id, inviteId), isNull(invites.acceptedAt), isNull(invites.revokedAt)))
      .returning({ id: invites.id });
    if (revoked === undefined) {
      throw new DomainError(409);
    }
    await recordStaffWrite(tx, actor, {
      action: "invite.revoke",
      targetTable: "invites",
      targetId: inviteId,
    });
  });
}

/** The e-mail a still-valid token was sent to, so the sign-up screen can prefill it. */
export async function findPendingInvite(db: Database, token: string, now: Date) {
  const [invite] = await db
    .select({ email: invites.email, role: invites.role })
    .from(invites)
    .where(
      and(
        eq(invites.tokenHash, hashToken(token)),
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
        gt(invites.expiresAt, now),
      ),
    );
  return invite ?? null;
}
