import { ImageResponse } from "next/og";
import { emailPalette } from "@/emails/palette";
import { siteName } from "@/lib/site-name";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const INITIAL_SIZE = 110;

export default function AppleIcon() {
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
      }}
    >
      {siteName.charAt(0)}
    </div>,
    size,
  );
}
