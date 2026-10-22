import QRCode from "qrcode";

/*
 * A QR code for an address. In a PDF it goes in as a PNG data address, which is what the library's
 * image takes; on a page it is an SVG string, which stays sharp at any size.
 */

const QUIET_ZONE_MODULES = 1;
const PNG_WIDTH = 240;

/** One path of the dark squares, with a quiet zone, sized in module units. */
export function qrPath(text: string): { d: string; size: number } {
  const code = QRCode.create(text);
  const size = code.modules.size;
  const quiet = QUIET_ZONE_MODULES;
  const span = size + quiet * 2;
  const squares: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (code.modules.get(row, column) === 1) {
        squares.push(`M${column + quiet} ${row + quiet}h1v1h-1z`);
      }
    }
  }
  return { d: squares.join(""), size: span };
}

export function qrPngDataUri(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: QUIET_ZONE_MODULES, width: PNG_WIDTH });
}

/**
 * The code as an SVG document, drawn in one color on a transparent ground, or on the given one: a
 * code a camera must read is drawn dark on light whatever the page's theme is.
 */
export function qrSvg(text: string, color: string, ground = "#0000"): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: QUIET_ZONE_MODULES,
    color: { dark: color, light: ground },
  });
}
