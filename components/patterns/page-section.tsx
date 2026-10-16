import { type ReactNode, useId } from "react";

type PageSectionProps = {
  title: string;
  /** One or two lines on what the section is for, under the title, at most 60ch. */
  help?: string;
  /** The section's own actions, on the right of the title. */
  actions?: ReactNode;
  children: ReactNode;
};

/*
 * One section of a page, below the record or the list it belongs to: a rule, the title in the
 * section role (22px), an optional line of help and the content. The rule and the space above it are
 * what tell one section from the next, so sections never run into each other; inside, groups take a
 * block title (18px), fields their label (15px). The 14px label is for column headers and meta,
 * never a heading. Named for a screen reader by its title.
 */
export function PageSection({ title, help, actions, children }: PageSectionProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-5 border-t border-line pt-8 print:break-inside-avoid"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-section text-ink">
            {title}
          </h2>
          {help === undefined ? null : (
            <p className="max-w-[60ch] text-body-small text-ink-muted">{help}</p>
          )}
        </div>
        {actions === undefined ? null : (
          <div className="flex flex-wrap items-center gap-3 print:hidden">{actions}</div>
        )}
      </div>
      {children}
    </section>
  );
}
