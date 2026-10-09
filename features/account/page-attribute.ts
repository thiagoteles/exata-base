import { ONE_YEAR_SECONDS, type PageAttributeKey, pageAttributes } from "@/lib/theme";

type Entry = { cookie: string; attribute: string; values: readonly string[] };

/**
 * Applies one look choice to this page at once: the attribute for what is on screen, and the cookie
 * for the next first paint. A value that does not set the attribute (the system's own, the default)
 * takes it off and clears the cookie. The server saves the choice and writes the same cookie.
 */
export function applyPageAttribute(key: PageAttributeKey, value: string): void {
  const entry: Entry | undefined = pageAttributes.find((candidate) => candidate.key === key);
  if (entry === undefined) {
    return;
  }
  const { cookie, attribute, values } = entry;
  const root = document.documentElement;
  const sets = values.includes(value);
  if (sets) {
    root.setAttribute(attribute, value);
  } else {
    root.removeAttribute(attribute);
  }
  // biome-ignore lint/suspicious/noDocumentCookie: the cookie is read by the script before the first paint
  document.cookie = sets
    ? `${cookie}=${value}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`
    : `${cookie}=; Path=/; Max-Age=0; SameSite=Lax`;
}
