import type { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { signedDownloadUrl } from "@/lib/files/service";
import { withErrorResponse } from "@/lib/http";
import { requireRole } from "@/lib/ports/auth";
import { fileStorage } from "@/lib/ports/storage";
import { timedRoute } from "@/lib/timed-route";

/** Sends the owner to a short-lived signed link. Someone else's file looks like no file at all. */
export const GET = timedRoute(
  "/catalog/files/[id]",
  (_request: NextRequest, { params }: RouteContext<"/catalog/files/[id]">) =>
    withErrorResponse(async () => {
      const user = await requireRole("staff");
      const { id } = await params;
      const url = await signedDownloadUrl(db, await fileStorage(), user.id, id);
      if (url === null) {
        throw new DomainError(404);
      }
      return Response.redirect(url, 302);
    }),
);
