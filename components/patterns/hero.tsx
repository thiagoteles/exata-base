import type { ReactNode } from "react";

type HeroProps = {
  /** A short label above the title, in small capitals: what this is, not a slogan. */
  eyebrow?: string;
  title: string;
  subtitle: string;
  /** The buttons. Two at most: the one thing to do, and the quiet way around it. */
  actions?: ReactNode;
  /** What shows the product next to the words: a sample record, a figure. Beside the text on wide screens. */
  aside?: ReactNode;
};

/*
 * The first screen of a public page. The title is the display type with a rule above it that stops
 * short of the edge, so the words sit on a line instead of floating; the aside is offset downward
 * so the two halves do not start on the same baseline.
 */
export function Hero({ eyebrow, title, subtitle, actions, aside }: HeroProps) {
  return (
    <section className="mx-auto grid w-full max-w-310 gap-12 px-4 py-12 md:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16 lg:py-18">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-0.5 w-12 bg-brand" />
          {eyebrow === undefined ? null : (
            <p className="text-label tracking-wide text-brand-ink uppercase">{eyebrow}</p>
          )}
        </div>
        <h1 className="text-display text-ink">{title}</h1>
        <p className="max-w-[52ch] text-body text-ink-muted">{subtitle}</p>
        {actions === undefined ? null : <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      {aside === undefined ? null : <div className="lg:mt-16">{aside}</div>}
    </section>
  );
}
