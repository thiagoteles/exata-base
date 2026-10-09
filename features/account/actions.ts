"use server";

import { currentInstant } from "@/domain/clock";
import { deleteAccount } from "@/lib/accounts/delete";
import { accountDeletionSteps } from "@/lib/accounts/deletion-steps";
import { actionFor } from "@/lib/actions/client";
import { createApiToken, revokeApiToken } from "@/lib/api/tokens";
import { db } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { sessionAccess } from "@/lib/ports/auth";
import { endDeviceSession, endOtherDeviceSessions } from "@/lib/sessions/service";
import { z } from "@/lib/validation";
import { createTokenSchema, revokeTokenSchema } from "./schema";

/** Deletes the signed-in person's own account. The screen that calls it leaves the signed-in area. */
export const deleteOwnAccount = actionFor("member")
  .metadata({ name: "deleteOwnAccount" })
  .action(async ({ ctx }) => {
    await deleteAccount(db, accountDeletionSteps, { userId: ctx.user.id, requestedBy: "self" });
    return { deleted: true };
  });

/** Ends one of the person's other devices. The one in use signs out by the normal button. */
export const endDevice = actionFor("member")
  .inputSchema(z.object({ id: z.uuid() }))
  .metadata({ name: "endDevice" })
  .action(async ({ parsedInput, ctx }) => {
    const access = await sessionAccess();
    if (access.kind !== "own") {
      throw new DomainError(400);
    }
    if (!(await endDeviceSession(db, ctx.user.id, parsedInput.id, access.currentId))) {
      throw new DomainError(404);
    }
    return { ended: true };
  });

/** Ends every device but this one. */
export const endOtherDevices = actionFor("member")
  .metadata({ name: "endOtherDevices" })
  .action(async ({ ctx }) => {
    const access = await sessionAccess();
    if (access.kind !== "own" || access.currentId === null) {
      throw new DomainError(400);
    }
    return { ended: await endOtherDeviceSessions(db, ctx.user.id, access.currentId) };
  });

const DAY_MS = 86_400_000;

/** Makes a personal API token. The token comes back once, here, and is never readable again. */
export const createToken = actionFor("member")
  .inputSchema(createTokenSchema)
  .metadata({ name: "createApiToken" })
  .action(async ({ parsedInput, ctx }) => {
    const now = currentInstant();
    const expiresAt =
      parsedInput.expiresInDays === null
        ? null
        : new Date(now.getTime() + parsedInput.expiresInDays * DAY_MS);
    return await createApiToken(db, ctx.user.id, {
      name: parsedInput.name,
      scopes: parsedInput.scopes,
      expiresAt,
    });
  });

/** Revokes one of the person's tokens at once. */
export const revokeToken = actionFor("member")
  .inputSchema(revokeTokenSchema)
  .metadata({ name: "revokeApiToken" })
  .action(async ({ parsedInput, ctx }) => {
    if (!(await revokeApiToken(db, ctx.user.id, parsedInput.id, currentInstant()))) {
      throw new DomainError(404);
    }
    return { revoked: true };
  });
