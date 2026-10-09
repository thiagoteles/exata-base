import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { emailPalette } from "@/emails/palette";
import { siteName } from "@/lib/site-name";
import { typeface } from "@/lib/typeface";

/*
 * The share image every page uses: the product name small, the page's title large in the
 * typeface's title face, and a line under it. Satori reads neither CSS variables nor oklch, so
 * colors come from the generated hex palette. The fonts are fetched once and kept; if they cannot
 * be fetched the image still renders, in the default face, so a share never breaks for a font.
 */

export const shareImageSize = { width: 1200, height: 630 };

type FontOption = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];

const HEADING_WEIGHT = 700;
const TEXT_WEIGHT = 400;
const truetype = /src: url\((.+?)\) format\(['"]truetype['"]\)/;

async function fontFile(family: string, weight: number): Promise<ArrayBuffer> {
  const query = `${family.replaceAll(" ", "+")}:wght@${weight}`;
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${query}`)).text();
  const url = truetype.exec(css)?.[1];
  if (url === undefined) {
    throw new Error(`no TrueType file for ${family} ${weight}`);
  }
  return (await fetch(url)).arrayBuffer();
}

async function shareImageFonts(): Promise<FontOption> {
  "use cache";
  cacheLife("max");
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
const SUBTITLE_SIZE = 36;
const RULE_HEIGHT = 10;
const RULE_WIDTH = 140;

/** The image for one page, with its title and one line under it. */
export async function shareImage({ title, subtitle }: { title: string; subtitle: string }) {
  const fonts = await shareImageFonts();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: PADDING,
        background: emailPalette.background,
        color: emailPalette.ink,
        fontFamily: "text",
      }}
    >
      <div style={{ fontSize: NAME_SIZE, color: emailPalette.inkMuted }}>{siteName}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{ width: RULE_WIDTH, height: RULE_HEIGHT, background: emailPalette.brandInk }}
        />
        <div
          style={{
            fontSize: TITLE_SIZE,
            fontFamily: "heading",
            fontWeight: HEADING_WEIGHT,
            lineHeight: 1.08,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: SUBTITLE_SIZE, color: emailPalette.inkMuted, lineHeight: 1.35 }}>
          {subtitle}
        </div>
      </div>
    </div>,
    { ...shareImageSize, ...(fonts === undefined || fonts.length === 0 ? {} : { fonts }) },
  );
}
