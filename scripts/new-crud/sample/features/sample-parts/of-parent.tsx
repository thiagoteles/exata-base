import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import type { Scope, Viewer } from "@/lib/access/rules";
import { db } from "@/lib/db/client";
import { samplePartsOfSampleItem } from "@/lib/sample-parts/records";
import { newSamplePartHref, samplePartHref, samplePartStatusTone } from "./presentation";

type SamplePartsOfSampleItemProps = {
  viewer: Viewer;
  scope: Scope;
  sampleItemId: string;
  /** The owner adds records here; the team only reads them. */
  canManage: boolean;
};

/**
 * The records filed under one sample item, shown on the sample item's page with the way to add
 * another already under it. The page composes it: an area never imports another area's screens.
 */
export async function SamplePartsOfSampleItem({
  viewer,
  scope,
  sampleItemId,
  canManage,
}: SamplePartsOfSampleItemProps) {
  const t = await getTranslations("sampleParts");
  const rows = await samplePartsOfSampleItem(db, viewer, scope, sampleItemId);
  const title = t("ofParent.title", { count: rows.length });
  return (
    <section aria-label={title} className="mb-12 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <h2 className="text-section text-ink">{title}</h2>
        {canManage ? (
          <Link
            href={newSamplePartHref(sampleItemId)}
            className={`${buttonClasses("secondary")} print:hidden`}
          >
            {t("ofParent.add")}
          </Link>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-body text-ink-muted">{t("ofParent.empty")}</p>
      ) : (
        <ul className="grid gap-px overflow-hidden rounded-cell border border-line bg-line sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.id} className="bg-surface">
              <Link
                href={samplePartHref(row.id)}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-sunken focus-visible:bg-sunken"
              >
                <span className="font-medium text-ink">{row.name}</span>
                <Stamp tone={samplePartStatusTone[row.status]}>{t(`statuses.${row.status}`)}</Stamp>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
