/*
 * The theme is chosen before the first paint. A tiny inline script reads the `theme` cookie and
 * sets `data-theme` on <html>; without the cookie the CSS follows the system setting. The cookie is
 * written on sign-in and when the person switches theme, copied from their saved options.
 */

export const THEME_COOKIE = "theme";

export const themes = ["light", "dark"] as const;

export type Theme = (typeof themes)[number];

export const ONE_YEAR_SECONDS = 31_536_000;

export const isTheme = (value: unknown): value is Theme => themes.some((theme) => theme === value);

/** Runs in the page before React: no imports, no dependencies, and it must never throw. */
export const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);if(m){document.documentElement.setAttribute("data-theme",m[1]);}}catch(e){}})();`;

/** The Set-Cookie value for a chosen theme, readable by the script above on the next load. */
export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
