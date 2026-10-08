import { ImageResponse } from "next/og";
import { emailPalette } from "@/emails/palette";
import { siteDescription, siteName } from "@/lib/site-name";

export const alt = siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PADDING = 80;
const NAME_SIZE = 96;
const DESCRIPTION_SIZE = 40;
const BAR_HEIGHT = 12;
const BAR_WIDTH = 160;

/** The default share image, drawn from the same tokens as the interface. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 32,
        padding: PADDING,
        background: emailPalette.background,
        color: emailPalette.ink,
      }}
    >
      <div style={{ width: BAR_WIDTH, height: BAR_HEIGHT, background: emailPalette.brandInk }} />
      <div style={{ fontSize: NAME_SIZE, fontWeight: 700 }}>{siteName}</div>
      <div style={{ fontSize: DESCRIPTION_SIZE, color: emailPalette.inkMuted }}>
        {siteDescription}
      </div>
    </div>,
    size,
  );
}
