import type { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { signedDownloadUrl } from "@/lib/files/service";
import { withErrorResponse } from "@/lib/http";
import { requireRole } from "@/lib/ports/auth";
import { fileStorage } from "@/lib/ports/storage";

/** Sends the owner to a short-lived signed link. Someone else's file looks like no file at all. */
export function GET(_request: NextRequest, { params }: RouteContext<"/catalog/files/[id]">) {
  return withErrorResponse(async () => {
    const user = await requireRole("staff");
    const { id } = await params;
    const url = await signedDownloadUrl(db, await fileStorage(), user.id, id);
    if (url === null) {
      throw new DomainError(404);
    }
    return Response.redirect(url, 302);
  });
}
