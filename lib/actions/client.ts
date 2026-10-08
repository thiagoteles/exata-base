import { headers } from "next/headers";
import { createSafeActionClient } from "next-safe-action";
import type { Role } from "@/lib/accounts/roles";
import { type ErrorBody, errorBody } from "@/lib/errors";
import { requireRole } from "@/lib/ports/auth";
import { logger } from "@/lib/ports/log";
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

/** The action client for a minimum role. The signed-in user arrives as `ctx.user`. */
export function actionFor(minimum: Role) {
  return action.use(async ({ next }) => next({ ctx: { user: await requireRole(minimum) } }));
}
