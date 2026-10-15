import type { ReactNode } from "react";

type Voice = {
  id: string;
  /** What the person would say, in their words and in the first person. */
  quote: string;
  /** What the product does about it, in one or two sentences. */
  answer: string;
  /** A way forward for this person in particular, if there is one. */
  action?: ReactNode;
};

type VoicesProps = {
  /** Names the list for a screen reader, such as "Para quem é". */
  label: string;
  items: readonly Voice[];
};

/*
 * Who the product is for, said the way those people say it: each line large, as a quote, with the
 * product's answer under it. They are the situations of the audience, not testimonials, so there is
 * no name, no photo and no star. Two columns on a wide screen, each quote under a rule.
 */
export function Voices({ label, items }: VoicesProps) {
  return (
    <ul aria-label={label} className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-4 border-t border-line-strong pt-6">
          <blockquote className="text-section text-ink before:content-['“'] after:content-['”']">
            {item.quote}
          </blockquote>
          <p className="max-w-[52ch] text-body text-ink-muted">{item.answer}</p>
          {item.action === undefined ? null : <div>{item.action}</div>}
        </li>
      ))}
    </ul>
  );
}
