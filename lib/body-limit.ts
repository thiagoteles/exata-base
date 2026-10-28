/*
 * A request body read with a ceiling. The declared length is only a hint a caller can leave out
 * (a chunked body has none), so the bytes are counted as they arrive and the read stops at the
 * ceiling: an oversized body is never held whole in memory.
 */

/** The body's bytes, or null as soon as they pass `maxBytes`. */
async function readBytesCapped(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (Number(request.headers.get("content-length") ?? "0") > maxBytes) {
    return null;
  }
  if (request.body === null) {
    return new Uint8Array();
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    // biome-ignore lint/performance/noAwaitInLoops: a stream is read one chunk after the other
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** The body as text, or null past `maxBytes`. */
export async function readTextCapped(request: Request, maxBytes: number): Promise<string | null> {
  const bytes = await readBytesCapped(request, maxBytes);
  return bytes === null ? null : new TextDecoder().decode(bytes);
}

/** The body as a form, or null past `maxBytes`. */
export async function readFormCapped(request: Request, maxBytes: number): Promise<FormData | null> {
  const bytes = await readBytesCapped(request, maxBytes);
  if (bytes === null) {
    return null;
  }
  const type = request.headers.get("content-type") ?? "";
  return await new Response(bytes, { headers: { "content-type": type } }).formData();
}
