import type { ReactNode } from "react";
import { PageHeader } from "@/components/patterns/page-header";
import { PageSection } from "@/components/patterns/page-section";

/** One part of a base screen: its controls already drawn, and the title it carries, if any. */
export type PageSectionEntry = {
  key: string;
  title: string | null;
  help?: string | undefined;
  content: ReactNode;
};

/** A base screen as a product receives it: the page's title and its sections in the base's order. */
export type SectionedPageProps = {
  title: string;
  subtitle: string;
  /** The page's own actions, drawn in its header. */
  controls?: ReactNode;
  sections: readonly PageSectionEntry[];
};

/** The base's own drawing: the header, then each section under its title, or bare when it has none. */
export function SectionedPage({ title, subtitle, controls, sections }: SectionedPageProps) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} showBack={false} controls={controls} />
      <div className="flex flex-col gap-10">
        {sections.map((section) =>
          section.title === null ? (
            <div key={section.key}>{section.content}</div>
          ) : (
            <PageSection key={section.key} title={section.title} help={section.help}>
              {section.content}
            </PageSection>
          ),
        )}
      </div>
    </>
  );
}
