import { type ReactNode, useId } from "react";

export function CatalogSection({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-6">
      <h2 id={titleId} className="text-section text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}
