import { RuntimeMarker } from "@/components/runtime-marker";
import { Panel } from "@/components/ui/panel";

/** A blank line, which ends one paragraph and starts the next. */
const PARAGRAPH_BREAK = /\n\s*\n/;

type LegalPageProps = {
  title: string;
  notice: string;
  sections: readonly { key: string; title: string; body: string }[];
};

/**
 * A reading page: one column of 680px, no sidebar, nothing competing with the text. A section's body
 * is plain text; a blank line between two runs of it starts a new paragraph.
 */
export function LegalPage({ title, notice, sections }: LegalPageProps) {
  return (
    <article className="mx-auto w-full max-w-170 px-4 py-12 md:py-18">
      <RuntimeMarker />
      <h1 className="text-page-title text-ink">{title}</h1>
      <Panel tone="info" className="mt-6">
        <p className="text-body-small text-ink">{notice}</p>
      </Panel>
      <div className="mt-8 flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-2">
            <h2 className="text-section text-ink">{section.title}</h2>
            {section.body.split(PARAGRAPH_BREAK).map((paragraph) => (
              <p key={paragraph} className="text-body text-ink">
                {paragraph.trim()}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
