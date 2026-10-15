import { shareImageSize } from "@/lib/og/size";
import { siteDescription, siteName } from "@/lib/site-name";

export const alt = siteName;
export const size = shareImageSize;
export const contentType = "image/png";

/**
 * The default share image. A page with its own image calls shareImage with its title. Every page
 * reads this file's size and alt, so the drawing is loaded only when the image is asked for. A
 * product that wants its product in the picture passes an `aside`, imported here the same way.
 */
export default async function OpenGraphImage() {
  const { shareImage } = await import("@/lib/og/share-image");
  return shareImage({ title: siteName, subtitle: siteDescription });
}
