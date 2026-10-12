"use server";

import { refresh } from "next/cache";
import { currentInstant } from "@/domain/clock";
import { accountDeletionSteps } from "@/lib/accounts/deletion-steps";
import { revokeInvite } from "@/lib/accounts/invites";
import { changeRole } from "@/lib/accounts/role-change";
import { actionFor } from "@/lib/actions/client";
import { sendInvite } from "@/lib/admin/invite-mailer";
import { inviteByEmail } from "@/lib/admin/invites";
import { grantCourtesy, refundLastPayment, removeUser, revokeCourtesy } from "@/lib/admin/users";
import { db } from "@/lib/db/client";
import { requestLocale } from "@/lib/ports/email/locale";
import { requireGateway } from "@/lib/ports/payment";
import { courtesySchema, inviteSchema, roleChangeSchema, userIdSchema } from "./schema";

/* Every action here needs the admin role, which `actionFor` checks before the body runs. */

const actorOf = ({ id, email }: { id: string; email: string }) => ({ id, email });

export const setUserRole = actionFor("admin")
  .inputSchema(roleChangeSchema)
  .metadata({ name: "setUserRole" })
  .action(async ({ parsedInput, ctx }) => {
    await changeRole(db, actorOf(ctx.user), parsedInput.id, parsedInput.role);
    return { role: parsedInput.role };
  });

export const giveCourtesy = actionFor("admin")
  .inputSchema(courtesySchema)
  .metadata({ name: "giveCourtesy" })
  .action(async ({ parsedInput, ctx }) => {
    await grantCourtesy(db, actorOf(ctx.user), parsedInput.id, parsedInput.reason);
    return { granted: true };
  });

export const takeCourtesyBack = actionFor("admin")
  .inputSchema(userIdSchema)
  .metadata({ name: "takeCourtesyBack" })
  .action(async ({ parsedInput, ctx }) => {
    await revokeCourtesy(db, actorOf(ctx.user), parsedInput.id);
    return { revoked: true };
  });

export const refundUser = actionFor("admin")
  .inputSchema(userIdSchema)
  .metadata({ name: "refundUser" })
  .action(async ({ parsedInput, ctx }) => {
    const gateway = await requireGateway();
    await refundLastPayment(db, actorOf(ctx.user), parsedInput.id, gateway.refundLastPayment);
    return { refunded: true };
  });

export const deleteUser = actionFor("admin")
  .inputSchema(userIdSchema)
  .metadata({ name: "deleteUser" })
  .action(async ({ parsedInput, ctx }) => {
    await removeUser(db, accountDeletionSteps, actorOf(ctx.user), parsedInput.id);
    // The list is read per request, so only the admin's own screen needs to catch up.
    refresh();
    return { deleted: true };
  });

export const inviteUser = actionFor("admin")
  .inputSchema(inviteSchema)
  .metadata({ name: "inviteUser" })
  .action(async ({ parsedInput, ctx }) => {
    const actor = actorOf(ctx.user);
    await inviteByEmail(db, actor, parsedInput, {
      send: async (invite) =>
        sendInvite({
          to: parsedInput.email,
          inviterEmail: actor.email,
          role: parsedInput.role,
          token: invite.token,
          locale: await requestLocale(),
        }),
      now: currentInstant(),
    });
    return { invited: true };
  });

export const withdrawInvite = actionFor("admin")
  .inputSchema(userIdSchema)
  .metadata({ name: "withdrawInvite" })
  .action(async ({ parsedInput, ctx }) => {
    await revokeInvite(db, actorOf(ctx.user), parsedInput.id, currentInstant());
    return { revoked: true };
  });
