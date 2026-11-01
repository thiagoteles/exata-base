import { ImageResponse } from "next/og";
import { productIcon } from "@/components/brand-icon.product";
import { emailPalette } from "@/emails/palette";
import { siteName } from "@/lib/site-name";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const INITIAL_SIZE = 20;
const CORNER = 8;

/** The product's own mark in the browser tab; until it has one, the first letter of its name. */
export default function Icon() {
  return new ImageResponse(
    productIcon === null ? (
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
      </div>
    ) : (
      productIcon({ size: size.width, corner: CORNER })
    ),
    size,
  );
}
