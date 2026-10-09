import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ButtonsDemo() {
  const t = useTranslations("catalog.buttons");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>{t("primary")}</Button>
      <Button variant="secondary">{t("secondary")}</Button>
      <Button tone="danger">{t("danger")}</Button>
      <Button icon={<IconPlus className="size-5" aria-hidden="true" />}>{t("withIcon")}</Button>
      <Button loading>{t("loading")}</Button>
      <Button disabled>{t("disabled")}</Button>
      <div className="flex w-full flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button size="sm">{t("small")}</Button>
        <Button size="sm" variant="secondary">
          {t("secondary")}
        </Button>
        <Button size="sm" variant="secondary" tone="danger">
          {t("dangerQuiet")}
        </Button>
      </div>
    </div>
  );
}
