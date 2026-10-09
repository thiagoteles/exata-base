/*
 * What the page looks like is chosen before the first paint. A tiny inline script reads a cookie
 * for each of the choices below and sets an attribute on <html>; without the cookie the CSS follows
 * the system setting. Each cookie is written when the person changes the choice and, on sign-in,
 * copied from what they saved. The CSS reads the attributes: the theme and the stronger contrast
 * swap colors, the text size scales the root, and reduced motion cuts every animation short.
 */

export const THEME_COOKIE = "theme";
export const FONT_SCALE_COOKIE = "font-scale";
export const MOTION_COOKIE = "motion";
export const CONTRAST_COOKIE = "contrast";

export const themes = ["light", "dark"] as const;

export type Theme = (typeof themes)[number];

/** What a person picks: one of the themes, or the system's own setting. */
export type ThemeChoice = Theme | "system";

export const ONE_YEAR_SECONDS = 31_536_000;

export const isTheme = (value: unknown): value is Theme => themes.some((theme) => theme === value);

/**
 * The choices that become an attribute on <html>. `values` are the ones that set it; any other
 * (the system's own, the default) leaves it off, and the cookie is cleared.
 */
export const pageAttributes = [
  { key: "theme", cookie: THEME_COOKIE, attribute: "data-theme", values: themes },
  {
    key: "fontScale",
    cookie: FONT_SCALE_COOKIE,
    attribute: "data-font-scale",
    values: ["large", "larger"],
  },
  { key: "motion", cookie: MOTION_COOKIE, attribute: "data-motion", values: ["reduce"] },
  { key: "contrast", cookie: CONTRAST_COOKIE, attribute: "data-contrast", values: ["more"] },
] as const;

export type PageAttributeKey = (typeof pageAttributes)[number]["key"];

const reads = pageAttributes
  .map(
    ({ cookie, attribute, values }) =>
      `m=c.match(/(?:^|; )${cookie}=(${values.join("|")})(?:;|$)/);if(m){d.setAttribute("${attribute}",m[1]);}`,
  )
  .join("");

// With no choice of its own, a person whose system asks for more contrast gets the stronger palette.
const systemContrast = `if(!d.hasAttribute("data-contrast")&&matchMedia("(prefers-contrast: more)").matches){d.setAttribute("data-contrast","more");}`;

/** Runs in the page before React: no imports, no dependencies, and it must never throw. */
export const pageScript = `(function(){try{var d=document.documentElement,c=document.cookie,m;${reads}${systemContrast}}catch(e){}})();`;

/** The Set-Cookie value for a chosen theme, readable by the script above on the next load. */
export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
