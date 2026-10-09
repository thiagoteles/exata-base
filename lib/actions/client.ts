import { headers } from "next/headers";
import { createSafeActionClient } from "next-safe-action";
import type { Feature } from "@/domain/billing/entitlements";
import type { Role } from "@/lib/accounts/roles";
import { assertFeature } from "@/lib/billing/guard";
import { type ErrorBody, errorBody } from "@/lib/errors";
import { requireRole } from "@/lib/ports/auth";
import { logger } from "@/lib/ports/log";
import { enforceRateLimit, requestAddressSubject } from "@/lib/rate-limit/guard";
import type { RateLimit } from "@/lib/rate-limit/service";
import { REQUEST_ID_HEADER } from "@/lib/request-id";

/*
 * Every server action is built here. The input schema is validated before the action runs, the
 * role middleware reads the session and checks the role, and any error leaves in the single
 * domain error shape with the request id. An action never repeats a guard or a validation.
 */

const action = createSafeActionClient({
  defaultValidationErrorsShape: "flattened",
  async handleServerError(error): Promise<ErrorBody["error"]> {
    const requestId = (await headers()).get(REQUEST_ID_HEADER) ?? "unknown";
    const body = errorBody(error, requestId).error;
    if (body.status === 500) {
      logger.error("server action failed", { error, requestId });
    }
    return body;
  },
});

/** The action client for screens a visitor can use before signing in. */
export const publicAction = action;

/** A public action counted per address, for anything a visitor can repeat: forms, sign-ups. */
export function limitedPublicAction(rateLimit: RateLimit) {
  return action.use(async ({ next }) => {
    await enforceRateLimit(rateLimit, await requestAddressSubject());
    return next();
  });
}

/**
 * The action client for a minimum role. The signed-in user arrives as `ctx.user`. With
 * `feature`, the plan must grant it; with `rateLimit`, each person is counted by id. Both run
 * after the role check, so a refused visitor never reaches the plan or spends the limit.
 */
export function actionFor(
  minimum: Role,
  options: { feature?: Feature; rateLimit?: RateLimit } = {},
) {
  return action.use(async ({ next }) => {
    const user = await requireRole(minimum);
    if (options.feature !== undefined) {
      await assertFeature(user.id, options.feature);
    }
    if (options.rateLimit !== undefined) {
      await enforceRateLimit(options.rateLimit, `user:${user.id}`);
    }
    return next({ ctx: { user } });
  });
}
