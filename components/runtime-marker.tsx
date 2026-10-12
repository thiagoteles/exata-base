import { connection } from "next/server";
import { Suspense } from "react";

async function Marker() {
  await connection();
  return null;
}

/**
 * Says that this page reads the running server on purpose: its metadata does, to use the address the
 * app runs at. Without it Next reports the metadata as blocking; with it the rest of the page can
 * still be prerendered. It goes inside the page, not in a layout above it.
 */
export function RuntimeMarker() {
  return (
    <Suspense>
      <Marker />
    </Suspense>
  );
}
