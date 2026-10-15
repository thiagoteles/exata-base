type ProofItem = { id: string; title: string; body?: string };

type ProofStripProps = {
  /** Names the list for a screen reader, such as "O que o produto garante". */
  label: string;
  /** Three or four short claims, each one a fact a visitor can check. */
  items: readonly ProofItem[];
};

/*
 * The claims under a hero, set like the index of a newspaper: numbered in mono, divided by hairlines,
 * with no box and no icon. Stacked on a narrow screen, two by two in the middle, in one row on a
 * wide one. Each claim is a fact, not an adjective, so the strip reads as proof and not as praise.
 */
export function ProofStrip({ label, items }: ProofStripProps) {
  return (
    <section aria-label={label} className="mx-auto w-full max-w-310 px-4 md:px-8">
      <ol className="grid border-y border-line md:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 border-line py-6 not-first:border-t md:odd:pe-6 md:even:border-s md:even:ps-6 md:nth-2:border-t-0 lg:not-first:border-t-0 lg:pe-6 lg:not-first:border-s lg:not-first:ps-6 lg:last:pe-0"
          >
            <span aria-hidden="true" className="font-mono text-data text-ink-muted tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-field-label text-ink">{item.title}</p>
            {item.body === undefined ? null : (
              <p className="max-w-[36ch] text-body-small text-ink-muted">{item.body}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
