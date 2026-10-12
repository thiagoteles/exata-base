import { useTranslations } from "next-intl";
import { paletteNames } from "@/lib/palettes";

type CategoryName = (typeof paletteNames.category)[number];

/*
 * Tailwind reads class names as written, so each color of the group is spelled out here. The record
 * is typed by the generated names: a color added to design.json that is missing from it, or one
 * removed, fails the typecheck.
 */
const classes: Record<CategoryName, { fill: string; ink: string }> = {
  alpha: { fill: "bg-category-alpha", ink: "text-category-alpha-ink" },
  beta: { fill: "bg-category-beta", ink: "text-category-beta-ink" },
  gamma: { fill: "bg-category-gamma", ink: "text-category-gamma-ink" },
  delta: { fill: "bg-category-delta", ink: "text-category-delta-ink" },
  epsilon: { fill: "bg-category-epsilon", ink: "text-category-epsilon-ink" },
};

/*
 * A sample of the named palette: a bar split in the declared order, then one line per color with a
 * mark and its name in the ink. The order is the one the verifier measured, so neighbors stay apart.
 */
export function PaletteDemo() {
  const t = useTranslations("catalog.palettes");
  const shares: Record<CategoryName, number> = {
    alpha: 34,
    beta: 22,
    gamma: 19,
    delta: 15,
    epsilon: 10,
  };
  return (
    <div className="flex max-w-[52ch] flex-col gap-4">
      <p className="text-body-small text-ink-muted">{t("help")}</p>
      <div
        role="img"
        aria-label={t("barLabel")}
        className="flex h-6 gap-0.5 overflow-hidden rounded-control"
      >
        {paletteNames.category.map((name) => (
          <span
            key={name}
            className={`${classes[name].fill} min-w-1`}
            style={{ flexGrow: shares[name] }}
          />
        ))}
      </div>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {paletteNames.category.map((name) => (
          <li key={name} className="flex items-center gap-3 py-2">
            <span aria-hidden="true" className={`size-3 rounded-full ${classes[name].fill}`} />
            <span className={`text-field-label ${classes[name].ink}`}>{t(`names.${name}`)}</span>
            <span className="ms-auto tabular-nums text-body-small text-ink-muted">
              {t("share", { value: shares[name] })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
