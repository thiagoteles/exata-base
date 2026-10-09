import { RuntimeMarker } from "@/components/runtime-marker";
import { Panel } from "@/components/ui/panel";

type LegalPageProps = {
  title: string;
  notice: string;
  sections: readonly { key: string; title: string; body: string }[];
};

/** A reading page: one column of 680px, no sidebar, nothing competing with the text. */
export function LegalPage({ title, notice, sections }: LegalPageProps) {
  return (
    <article className="mx-auto w-full max-w-170 px-4 py-12 md:py-18">
      <RuntimeMarker />
      <h1 className="text-page-title text-ink">{title}</h1>
      <Panel level="highlight" className="mt-6">
        <p className="text-body-small text-ink">{notice}</p>
      </Panel>
      <div className="mt-8 flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-2">
            <h2 className="text-section text-ink">{section.title}</h2>
            <p className="text-body text-ink">{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
