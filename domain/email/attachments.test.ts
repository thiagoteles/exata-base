import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkAttachments, safeAttachmentName } from "./attachments";

describe("the cap on a message's attachments", () => {
  it("accepts files whose total is at or under the cap", () => {
    expect(checkAttachments([], 100)).toEqual({ ok: true, totalBytes: 0 });
    expect(
      checkAttachments(
        [
          { filename: "a.pdf", bytes: 60 },
          { filename: "b.pdf", bytes: 40 },
        ],
        100,
      ),
    ).toEqual({ ok: true, totalBytes: 100 });
  });

  it("refuses the whole send over the cap and lists the files largest first", () => {
    const check = checkAttachments(
      [
        { filename: "small.pdf", bytes: 10 },
        { filename: "big.pdf", bytes: 95 },
      ],
      100,
    );
    expect(check).toEqual({
      ok: false,
      totalBytes: 105,
      maxBytes: 100,
      files: [
        { filename: "big.pdf", bytes: 95 },
        { filename: "small.pdf", bytes: 10 },
      ],
    });
  });

  it("is ok exactly when the total fits, whatever the files", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5_000_000 }), { maxLength: 8 }),
        fc.integer({ min: 0, max: 20_000_000 }),
        (sizes, cap) => {
          const files = sizes.map((bytes, index) => ({ filename: `f${index}`, bytes }));
          const total = sizes.reduce((sum, size) => sum + size, 0);
          expect(checkAttachments(files, cap).ok).toBe(total <= cap);
        },
      ),
    );
  });
});

describe("an attachment's name", () => {
  it("keeps a plain name", () => {
    expect(safeAttachmentName("INV-0008.pdf")).toBe("INV-0008.pdf");
    expect(safeAttachmentName("extrato de setembro.pdf")).toBe("extrato de setembro.pdf");
  });

  it("removes a path, control characters and the characters a disk refuses", () => {
    expect(safeAttachmentName("../../etc/passwd")).toBe("_.._etc_passwd");
    expect(safeAttachmentName("a\r\nBcc: x@y.z.pdf")).toBe("a_Bcc_ x@y.z.pdf");
    expect(safeAttachmentName('re"port*?.pdf')).toBe("re_port_.pdf");
  });

  it("falls back to a name when nothing is left", () => {
    expect(safeAttachmentName("")).toBe("file");
    expect(safeAttachmentName("   ")).toBe("file");
    expect(safeAttachmentName("...")).toBe("file");
    expect(safeAttachmentName("///")).toBe("file");
  });

  it("cuts a long name and keeps its extension", () => {
    const name = safeAttachmentName(`${"a".repeat(300)}.pdf`);
    expect(name.length).toBe(120);
    expect(name.endsWith(".pdf")).toBe(true);
    expect(safeAttachmentName("b".repeat(300)).length).toBe(120);
  });

  it("never returns a path separator, a control character or an empty name", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (input) => {
        const name = safeAttachmentName(input);
        const unsafe = [...name].some(
          (character) => character === "/" || character === "\\" || character.charCodeAt(0) < 32,
        );
        expect(unsafe).toBe(false);
        expect(name.length).toBeGreaterThan(0);
        expect(name.length).toBeLessThanOrEqual(120);
      }),
    );
  });
});
