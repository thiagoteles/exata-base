import { connection, type NextRequest } from "next/server";
import { readLocalFile } from "@/lib/ports/storage";
import { attachmentDisposition } from "@/lib/ports/storage/attachment";
import { timedRoute } from "@/lib/timed-route";

/** Serves a file from the local disk to whoever holds a valid signed URL. */
export const GET = timedRoute(
  "/storage/[...key]",
  async (request: NextRequest, { params }: RouteContext<"/storage/[...key]">) => {
    await connection();
    const { key } = await params;
    const file = await readLocalFile(key.join("/"), request.nextUrl.searchParams);
    if (file === null) {
      return new Response(null, { status: 404 });
    }
    return new Response(file.body, {
      headers: {
        "content-type": file.contentType,
        "content-disposition": attachmentDisposition(file.downloadName),
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
      },
    });
  },
);
