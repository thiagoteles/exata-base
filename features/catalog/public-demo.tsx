import { useTranslations } from "next-intl";
import { Faq } from "@/components/patterns/faq";
import { PricingTable } from "@/components/patterns/pricing-table";
import { Button } from "@/components/ui/button";

const featureIds = ["reports", "export", "support"] as const;
const questionIds = ["trial", "switch"] as const;

/** The public site's pricing table and FAQ with sample plans, since a fresh product has no price on sale. */
export function PublicDemo() {
  const t = useTranslations("catalog.publicPatterns");
  const features = featureIds.map((id) => t(`features.${id}`));
  return (
    <div className="flex flex-col gap-10">
      <PricingTable
        caption={t("caption")}
        featuresLabel={t("compare")}
        includedLabel={t("included")}
        excludedLabel={t("notIncluded")}
        features={features}
        columns={[
          {
            id: "free",
            name: t("plans.free"),
            price: t("free"),
            unit: t("noEnd"),
            has: [true, false, false],
          },
          {
            id: "monthly",
            name: t("plans.monthly"),
            price: "R$ 29,00",
            unit: t("perMonth"),
            has: [true, true, false],
            action: <Button variant="secondary">{t("subscribe")}</Button>,
          },
          {
            id: "yearly",
            name: t("plans.yearly"),
            price: "R$ 290,00",
            unit: t("perYear"),
            highlighted: true,
            note: t("yearlyNote"),
            has: [true, true, true],
            action: <Button>{t("subscribe")}</Button>,
          },
        ]}
      />
      <div className="max-w-3xl">
        <Faq
          defaultOpen="trial"
          items={questionIds.map((id) => ({
            id,
            question: t(`faq.${id}.question`),
            answer: t(`faq.${id}.answer`),
          }))}
        />
      </div>
    </div>
  );
}
