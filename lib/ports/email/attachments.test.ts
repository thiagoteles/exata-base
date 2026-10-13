import { describe, expect, it } from "vitest";
import { prepareAttachments } from "./attachments";

const file = (filename: string, bytes: number) => ({
  filename,
  contentType: "application/pdf",
  content: new Uint8Array(bytes),
});

const MB = 1_048_576;

describe("the attachments a message leaves with", () => {
  it("passes a message with no attachments through unchanged", () => {
    expect(prepareAttachments(undefined, 10)).toEqual({ ok: true, attachments: undefined });
    expect(prepareAttachments([], 10)).toEqual({ ok: true, attachments: undefined });
  });

  it("cleans each name and keeps the bytes", () => {
    const prepared = prepareAttachments([file("../extrato\r\n.pdf", 5)], 10);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.attachments?.[0]?.filename).toBe("_extrato_.pdf");
      expect(prepared.attachments?.[0]?.content.byteLength).toBe(5);
    }
  });

  it("accepts a total exactly at the cap", () => {
    expect(prepareAttachments([file("a.pdf", 5 * MB), file("b.pdf", 5 * MB)], 10).ok).toBe(true);
  });

  it("refuses the whole set over the cap and reports every file's size", () => {
    const prepared = prepareAttachments([file("a.pdf", 6 * MB), file("b.pdf", 5 * MB)], 10);
    expect(prepared.ok).toBe(false);
    if (!prepared.ok) {
      expect(prepared.check.totalBytes).toBe(11 * MB);
      expect(prepared.check.maxBytes).toBe(10 * MB);
      expect(prepared.check.files.map((entry) => entry.filename)).toEqual(["a.pdf", "b.pdf"]);
    }
  });
});
