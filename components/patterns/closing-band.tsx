import type { ReactNode } from "react";

type ClosingBandProps = {
  title: string;
  body?: string;
  /** The same one thing to do as the hero, and the quiet way around it. */
  actions: ReactNode;
};

/*
 * The last screen of a public page: the promise once more, as large as the hero's, and the same
 * action. It is the one band that spans the page on the sunken ground, ruled on top, so the page
 * ends on a decision and not on the footer.
 */
export function ClosingBand({ title, body, actions }: ClosingBandProps) {
  return (
    <section className="border-t border-line-strong bg-sunken">
      <div className="mx-auto flex w-full max-w-310 flex-col items-start gap-6 px-4 py-16 md:px-8 md:py-24">
        <h2 className="max-w-[22ch] text-display text-ink">{title}</h2>
        {body === undefined ? null : (
          <p className="max-w-[52ch] text-body text-ink-muted">{body}</p>
        )}
        <div className="flex flex-wrap gap-3">{actions}</div>
      </div>
    </section>
  );
}
