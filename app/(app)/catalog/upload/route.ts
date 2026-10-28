import { readFormCapped } from "@/lib/body-limit";
import { db } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { uploadLimits } from "@/lib/files/limits";
import { saveUpload } from "@/lib/files/service";
import { withErrorResponse } from "@/lib/http";
import { requireRole } from "@/lib/ports/auth";
import { fileStorage } from "@/lib/ports/storage";
import { timedRoute } from "@/lib/timed-route";

const FORM_OVERHEAD_BYTES = 1_048_576;

/** Receives one file from the catalog. Size and type are checked before anything is stored. */
export const POST = timedRoute("/catalog/upload", (request: Request) => {
  return withErrorResponse(async () => {
    const user = await requireRole("staff");
    const limits = uploadLimits();
    // Read with a ceiling, so a huge file is never buffered, declared length or not.
    const form = await readFormCapped(request, limits.maxBytes + FORM_OVERHEAD_BYTES);
    if (form === null) {
      throw new DomainError(400, "fileTooLarge");
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new DomainError(400);
    }
    const saved = await saveUpload({
      db,
      storage: await fileStorage(),
      ownerId: user.id,
      file: { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) },
      limits,
    });
    return Response.json(saved, { status: 201 });
  });
});
