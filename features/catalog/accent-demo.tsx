import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { type AccentName, accentNames } from "@/lib/accents";

/*
 * Every block reads only the four accent tokens; the container's data-accent decides the tone.
 * The nested column is the contract: an inner scope wins over its parent, and "brand" restores
 * the tone that applies outside every scope.
 */

function Sample({ name, fill, ink }: { name: AccentName; fill: string; ink: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="min-w-16 text-data text-accent-ink">{name}</span>
      <span className="inline-flex items-center rounded-stamp bg-accent px-2 py-0.5 text-label font-semibold text-on-accent">
        {fill}
      </span>
      <span className="text-body text-accent-ink">{ink}</span>
    </div>
  );
}

function Scope({ name, children }: { name: AccentName; children: ReactNode }) {
  return (
    <div
      data-accent={name}
      className="flex flex-col gap-3 border-accent border-s-[3px] bg-accent-wash py-3 ps-4 pe-3"
    >
      {children}
    </div>
  );
}

export function AccentDemo() {
  const t = useTranslations("catalog.accent");
  const [outer = "brand", inner = "brand"] = accentNames.filter((name) => name !== "brand");
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-2">
        {accentNames.map((name) => (
          <Scope key={name} name={name}>
            <Sample name={name} fill={t("fill")} ink={t("ink")} />
          </Scope>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <p className="max-w-[52ch] text-body-small text-ink-muted">{t("nested")}</p>
        <Scope name={outer}>
          <Sample name={outer} fill={t("fill")} ink={t("ink")} />
          <Scope name={inner}>
            <Sample name={inner} fill={t("fill")} ink={t("ink")} />
            <Scope name="brand">
              <Sample name="brand" fill={t("fill")} ink={t("ink")} />
            </Scope>
          </Scope>
        </Scope>
      </div>
    </div>
  );
}
