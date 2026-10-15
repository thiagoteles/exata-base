import type { ReactNode } from "react";

type ShowcaseProps = {
  /** A running number or a short tag above the title, such as "02". Decoration: it is not read out. */
  marker?: string;
  title: string;
  /** One or two short paragraphs. */
  body: readonly string[];
  /** What it does, in a few lines, each a fact. */
  points?: readonly string[];
  /** One action with a verb of its own ("Montar meu orçamento"), and at most a quiet second one. */
  actions?: ReactNode;
  /**
   * The proof: a real piece of the product (a record, a document, a figure), never a drawing of
   * one. It arrives as it scrolls into view.
   */
  proof: ReactNode;
  /** Puts the proof first on a wide screen, so sections in a row alternate sides. */
  mirror?: boolean;
  /**
   * Keeps the words in view while a tall proof scrolls past them on a wide screen, such as a demo
   * the visitor works through.
   */
  stickyText?: boolean;
  /** The section's address inside the page, for links to it ("#demo"). */
  anchor?: string;
};

/*
 * One thing the product does, shown: the words on one side and a real piece of the product on the
 * other. The proof gets the wider column, because it is what convinces. On a narrow screen the words
 * come first and the proof follows, whole, never squeezed beside them.
 */
export function Showcase({
  marker,
  title,
  body,
  points,
  actions,
  proof,
  mirror = false,
  stickyText = false,
  anchor,
}: ShowcaseProps) {
  return (
    <section
      {...(anchor === undefined ? {} : { id: anchor })}
      className={`mx-auto grid w-full max-w-310 scroll-mt-8 grid-cols-[minmax(0,1fr)] gap-10 px-4 py-14 md:px-8 md:py-20 lg:gap-16 ${mirror ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"}`}
    >
      <div
        className={`flex flex-col gap-5 ${mirror ? "lg:order-last" : ""} ${stickyText ? "lg:sticky lg:top-8 lg:self-start" : "lg:self-center"}`}
      >
        {marker === undefined ? null : (
          <span aria-hidden="true" className="font-mono text-data text-ink-muted tabular-nums">
            {marker}
          </span>
        )}
        <h2 className="text-page-title text-ink">{title}</h2>
        {body.map((paragraph) => (
          <p key={paragraph} className="max-w-[52ch] text-body text-ink-muted">
            {paragraph}
          </p>
        ))}
        {points === undefined ? null : (
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {points.map((point) => (
              <li key={point} className="py-3 text-body text-ink">
                {point}
              </li>
            ))}
          </ul>
        )}
        {actions === undefined ? null : <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      <div className="reveal min-w-0">{proof}</div>
    </section>
  );
}
