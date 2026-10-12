import QRCode from "qrcode";

/*
 * A QR code for an address. In a PDF it goes in as a PNG data address, which is what the library's
 * image takes; on a page it is an SVG string, which stays sharp at any size.
 */

const QUIET_ZONE_MODULES = 1;
const PNG_WIDTH = 240;

export function qrPngDataUri(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: QUIET_ZONE_MODULES, width: PNG_WIDTH });
}

/** The code as an SVG document, drawn in one color on a transparent ground. */
export function qrSvg(text: string, color: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: QUIET_ZONE_MODULES,
    color: { dark: color, light: "#0000" },
  });
}
