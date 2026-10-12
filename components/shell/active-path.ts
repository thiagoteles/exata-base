import { stripLocalePrefix } from "@/lib/i18n/negotiate";

/** A destination is current on its own page and on every page under it. */
export function isCurrent(address: string, href: string, exact = false): boolean {
  const pathname = stripLocalePrefix(address);
  return pathname === href || (!exact && pathname.startsWith(`${href}/`));
}
