import { currentInstant } from "@/domain/clock";
import { exportAccount } from "@/lib/accounts/export";
import { enforcePlanLimit } from "@/lib/billing/guard";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { withErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/ports/auth";
import { fileStorage } from "@/lib/ports/storage";
import { attachmentDisposition } from "@/lib/ports/storage/attachment";
import { timedRoute } from "@/lib/timed-route";

const slash = /\//g;

/** The signed-in person's data, as the ZIP described by the account export format. */
export const GET = timedRoute("/account/export", () =>
  withErrorResponse(async () => {
    const user = await requireUser();
    // A download of everything is the neutral example of a metered thing: the plan says how many a day.
    await enforcePlanLimit(user.id, "exports");
    const now = currentInstant();
    const zip = await exportAccount(db, await fileStorage(), user.id, now);
    const date = formatInstantDate(now).replace(slash, "-");
    return new Response(zip.slice().buffer, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": attachmentDisposition(`dados-${date}.zip`),
        "cache-control": "private, no-store",
      },
    });
  }),
);
