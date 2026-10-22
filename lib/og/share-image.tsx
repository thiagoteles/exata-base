import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { emailPalette } from "@/emails/palette";
import { siteName } from "@/lib/site-name";
import { typeface } from "@/lib/typeface";
import { shareImageSize } from "./size";

/*
 * The share image every page uses: the product name small, the page's title large in the
 * typeface's title face, and a line under it. Satori reads neither CSS variables nor oklch, so
 * colors come from the generated hex palette. The fonts are the static files kept for this image,
 * read once and kept. A missing file, or a face the renderer cannot read, still draws the image
 * in the default face, so a share never breaks for a font.
 */

type FontOption = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];

const HEADING_WEIGHT = 700;
const TEXT_WEIGHT = 400;

async function fontFile(family: string, weight: number): Promise<ArrayBuffer> {
  const bytes = await readFile(
    join(process.cwd(), "assets/fonts/share", `${family.replaceAll(" ", "")}-${weight}.ttf`),
  );
  return Uint8Array.from(bytes).buffer;
}

// Kept in the module, not in "use cache": a module with a cached function is compiled into every
// page that can reach it, even through an import(), and every page reaches the share image.
let fontsOnce: Promise<FontOption> | undefined;

function shareImageFonts(): Promise<FontOption> {
  fontsOnce ??= loadFonts();
  return fontsOnce;
}

async function loadFonts(): Promise<FontOption> {
  try {
    const [heading, text] = await Promise.all([
      fontFile(typeface.heading, HEADING_WEIGHT),
      fontFile(typeface.text, TEXT_WEIGHT),
    ]);
    return [
      { name: "heading", data: heading, weight: HEADING_WEIGHT, style: "normal" },
      { name: "text", data: text, weight: TEXT_WEIGHT, style: "normal" },
    ];
  } catch {
    return [];
  }
}

const PADDING = 80;
const NAME_SIZE = 32;
const TITLE_SIZE = 76;
const TITLE_SIZE_BESIDE = 60;
const SUBTITLE_SIZE = 36;
const SUBTITLE_SIZE_BESIDE = 30;
const RULE_HEIGHT = 10;
const RULE_WIDTH = 140;
const ASIDE_WIDTH = 440;
const ASIDE_GAP = 56;

type ShareImageInput = {
  title: string;
  subtitle: string;
  /**
   * A picture of the product beside the words, such as a sample document, drawn by the product in
   * the hex palette (Satori reads no class and no variable). The words take the rest of the width.
   */
  aside?: ReactElement;
};

function drawShareImage(
  { title, subtitle, aside }: ShareImageInput,
  fonts: FontOption,
): ImageResponse {
  const beside = aside !== undefined;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        gap: ASIDE_GAP,
        padding: PADDING,
        background: emailPalette.background,
        color: emailPalette.ink,
        fontFamily: "text",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: NAME_SIZE, color: emailPalette.inkMuted }}>{siteName}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{ width: RULE_WIDTH, height: RULE_HEIGHT, background: emailPalette.brandInk }}
          />
          <div
            style={{
              fontSize: beside ? TITLE_SIZE_BESIDE : TITLE_SIZE,
              fontFamily: "heading",
              fontWeight: HEADING_WEIGHT,
              lineHeight: 1.08,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: beside ? SUBTITLE_SIZE_BESIDE : SUBTITLE_SIZE,
              color: emailPalette.inkMuted,
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      {beside ? (
        <div style={{ width: ASIDE_WIDTH, display: "flex", alignItems: "center" }}>{aside}</div>
      ) : null}
    </div>,
    { ...shareImageSize, ...(fonts === undefined || fonts.length === 0 ? {} : { fonts }) },
  );
}

/** The image for one page, with its title and one line under it, and the product's picture if any. */
export async function shareImage(input: ShareImageInput) {
  const fonts = await shareImageFonts();
  try {
    return drawShareImage(input, fonts);
  } catch {
    return drawShareImage(input, []);
  }
}
