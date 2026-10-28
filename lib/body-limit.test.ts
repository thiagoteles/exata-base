import { describe, expect, it } from "vitest";
import { readFormCapped, readTextCapped } from "./body-limit";

// A chunked body: no content-length, so only counting the bytes as they arrive can refuse it.
function chunked(chunks: number, size: number) {
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent === chunks) {
        controller.close();
        return;
      }
      sent += 1;
      controller.enqueue(new Uint8Array(size).fill(97));
    },
  });
  const request = new Request("http://test/", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  return { request, sent: () => sent };
}

describe("a body read with a ceiling", () => {
  // The regression: trusting content-length alone let a chunked body be buffered whole (security review, 2026-10-28).
  it("stops reading a chunked body without a declared length once it passes the ceiling", async () => {
    const body = chunked(1000, 1024);
    expect(await readTextCapped(body.request, 4096)).toBeNull();
    expect(body.sent()).toBeLessThan(10);
  });

  it("refuses by the declared length before reading anything", async () => {
    const request = new Request("http://test/", {
      method: "POST",
      body: "x",
      headers: { "content-length": "999999" },
    });
    expect(await readTextCapped(request, 4096)).toBeNull();
  });

  it("returns a body within the ceiling whole, as text or as a form", async () => {
    expect(await readTextCapped(chunked(3, 1000).request, 4096)).toBe("a".repeat(3000));
    const form = new FormData();
    form.set("file", new File(["logo"], "logo.png", { type: "image/png" }));
    const parsed = await readFormCapped(
      new Request("http://test/", { method: "POST", body: form }),
      4096,
    );
    const file = parsed?.get("file");
    expect(file instanceof File ? await file.text() : null).toBe("logo");
  });
});
