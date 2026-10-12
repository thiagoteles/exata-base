import { Document, Image, Page, Text } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { documentColors, documentStyles, renderPdf } from "./pdf";
import { qrPngDataUri, qrSvg } from "./qr";

const latin1 = (bytes: Buffer) => bytes.toString("latin1");

describe("a generated PDF", () => {
  it("is a PDF with the document face embedded and the QR code drawn as an image", async () => {
    const qr = await qrPngDataUri("https://app.test/verify/abc");
    const bytes = await renderPdf(
      <Document title="Teste">
        <Page size="A4" style={documentStyles.page}>
          <Text style={{ color: documentColors.brandInk }}>Ação, coração, maçã</Text>
          <Image src={qr} style={{ width: 96, height: 96 }} />
        </Page>
      </Document>,
    );
    const text = latin1(bytes);
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text).toContain("SourceSerif4");
    expect(text).toContain("/Subtype /Image");
  });
});

describe("a QR code", () => {
  it("is a PNG data address for a PDF and an SVG in the given color for a page", async () => {
    expect(await qrPngDataUri("https://app.test/x")).toMatch(/^data:image\/png;base64,/);
    const svg = await qrSvg("https://app.test/x", "#123456");
    expect(svg).toContain("<svg");
    expect(svg).toContain("#123456");
  });
});
