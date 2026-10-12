"use client";

import { IconBell } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { type HeaderAction, PageHeader } from "@/components/patterns/page-header";
import { useToast } from "@/components/ui/use-toast";

/** The catalog's header. It has three actions to show how they fold into a menu on a phone. */
export function CatalogHeader() {
  const t = useTranslations("catalog");
  const notify = useToast();
  const show = () =>
    notify({ title: t("toast.title"), description: t("toast.description"), tone: "info" });
  const actions: HeaderAction[] = [
    {
      key: "notify",
      label: t("actions.notify"),
      variant: "primary",
      icon: <IconBell className="size-5" aria-hidden="true" />,
      onSelect: show,
    },
    { key: "second", label: t("actions.second"), onSelect: show },
    { key: "third", label: t("actions.third"), onSelect: show },
  ];
  return <PageHeader title={t("title")} subtitle={t("subtitle")} actions={actions} />;
}
