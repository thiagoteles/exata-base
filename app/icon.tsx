import { ImageResponse } from "next/og";
import { emailPalette } from "@/emails/palette";
import { siteName } from "@/lib/site-name";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const INITIAL_SIZE = 20;
const CORNER = 8;

/** The first letter of the product name on the ink color, until the product has its own mark. */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: emailPalette.ink,
        color: emailPalette.onAction,
        fontSize: INITIAL_SIZE,
        fontWeight: 700,
        borderRadius: CORNER,
      }}
    >
      {siteName.charAt(0)}
    </div>,
    size,
  );
}
