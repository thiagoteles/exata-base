import type { ReactNode } from "react";

type ContentSectionProps = {
  /** A running number or a short tag in the margin, such as "01". Decoration: it is not read out. */
  marker?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  /** Names the section for the page's outline when it carries its own heading level. */
  id?: string;
};

/*
 * A band of a public page: the heading hangs in a narrow column on the left, under a ruled top, and
 * the content takes the wide column on the right. On a narrow screen they stack. The structure repeats
 * from section to section, so the page reads as a ledger and not as a stack of boxes.
 */
export function ContentSection({ marker, title, intro, children, id }: ContentSectionProps) {
  return (
    <section
      {...(id === undefined ? {} : { id })}
      className="mx-auto w-full max-w-310 px-4 py-10 md:px-8 md:py-14"
    >
      <div className="grid gap-8 border-t border-line-strong pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] lg:gap-16">
        <header className="flex flex-col gap-2 lg:sticky lg:top-8 lg:self-start">
          {marker === undefined ? null : (
            <span aria-hidden="true" className="font-mono text-data text-ink-muted">
              {marker}
            </span>
          )}
          <h2 className="text-block-title text-ink">{title}</h2>
          {intro === undefined ? null : (
            <p className="max-w-[40ch] text-body-small text-ink-muted">{intro}</p>
          )}
        </header>
        <div>{children}</div>
      </div>
    </section>
  );
}
