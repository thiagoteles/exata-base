import { render } from "@react-email/render";
import { createTranslator } from "next-intl";
import type { ReactElement } from "react";
import { defaultLocale, type Locale } from "@/lib/i18n/locales";
import messages from "@/messages/pt-BR.json";

/** E-mail text comes from the `emails` namespace of the catalog, like any other screen. */
export function emailTranslator() {
  return createTranslator({ locale: defaultLocale, messages, namespace: "emails" });
}

export type EmailTranslator = ReturnType<typeof emailTranslator>;

/**
 * The translator for a recipient's language. The default language is already loaded; another one
 * loads its catalog, which has exactly the keys of the default, so the result has the same shape.
 */
export async function emailTranslatorFor(locale: Locale): Promise<EmailTranslator> {
  if (locale === defaultLocale) {
    return emailTranslator();
  }
  const catalog = (await import(`../../../messages/${locale}.json`)) as {
    default: typeof messages;
  };
  return createTranslator({ locale, messages: catalog.default, namespace: "emails" });
}

/** The plain-text version keeps headings as they were written instead of shouting them. */
const headings = ["h1", "h2", "h3", "h4", "h5", "h6"].map((selector) => ({
  selector,
  options: { uppercase: false },
}));

/** Renders an e-mail component on the server into the HTML and plain text that are sent. */
export async function renderEmail(element: ReactElement): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true, htmlToTextOptions: { selectors: headings } }),
  ]);
  return { html, text };
}
