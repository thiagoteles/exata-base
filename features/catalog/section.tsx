import { type ReactNode, useId } from "react";

type CatalogSectionProps = {
  /** A stable name, which a snapshot is saved under. It never changes with the title's wording. */
  name: string;
  title: string;
  /** False for a section whose content is live data, which a picture cannot hold still. */
  snapshot?: boolean;
  children: ReactNode;
};

export function CatalogSection({ name, title, snapshot = true, children }: CatalogSectionProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      data-catalog-section={name}
      {...(snapshot ? {} : { "data-snapshot": "skip" })}
      className="flex flex-col gap-6"
    >
      <h2 id={titleId} className="text-section text-ink">
        {title}
      </h2>
      {/* A flex item grows to its content unless it may shrink: a wide table must scroll in its own frame. */}
      <div className="min-w-0">{children}</div>
    </section>
  );
}
