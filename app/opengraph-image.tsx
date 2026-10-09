import { shareImage, shareImageSize } from "@/lib/og/share-image";
import { siteDescription, siteName } from "@/lib/site-name";

export const alt = siteName;
export const size = shareImageSize;
export const contentType = "image/png";

/** The default share image. A page with its own image calls shareImage with its title. */
export default function OpenGraphImage() {
  return shareImage({ title: siteName, subtitle: siteDescription });
}
