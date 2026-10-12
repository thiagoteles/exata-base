"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs } from "@/components/ui/tabs";

/** A trail, tabs in both sizes, and an accordion that keeps one row open or several. */
export function StructureDemo() {
  const t = useTranslations("catalog.structure");
  const [tab, setTab] = useState("overview");
  const [small, setSmall] = useState("one");
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <Breadcrumb
        label={t("trail")}
        items={[
          { label: t("crumbs.home"), href: "/" },
          { label: t("crumbs.catalog"), href: "/catalog" },
          { label: t("crumbs.current") },
        ]}
      />
      <Tabs
        label={t("tabs.label")}
        value={tab}
        onValueChange={setTab}
        tabs={[
          {
            value: "overview",
            label: t("tabs.overview"),
            content: <p className="text-body text-ink-muted">{t("tabs.overviewBody")}</p>,
          },
          {
            value: "activity",
            label: t("tabs.activity"),
            content: <p className="text-body text-ink-muted">{t("tabs.activityBody")}</p>,
          },
          { value: "locked", label: t("tabs.locked"), content: null, disabled: true },
          {
            value: "settings",
            label: t("tabs.settings"),
            content: <p className="text-body text-ink-muted">{t("tabs.settingsBody")}</p>,
          },
        ]}
      />
      <Tabs
        size="sm"
        label={t("tabs.compact")}
        value={small}
        onValueChange={setSmall}
        tabs={[
          {
            value: "one",
            label: t("tabs.one"),
            content: <p className="text-body-small text-ink-muted">{t("tabs.oneBody")}</p>,
          },
          {
            value: "two",
            label: t("tabs.two"),
            content: <p className="text-body-small text-ink-muted">{t("tabs.twoBody")}</p>,
          },
        ]}
      />
      <Accordion
        defaultOpen={["first"]}
        items={[
          {
            value: "first",
            title: t("accordion.first"),
            content: <p>{t("accordion.firstBody")}</p>,
          },
          {
            value: "second",
            title: t("accordion.second"),
            content: <p>{t("accordion.secondBody")}</p>,
          },
          {
            value: "third",
            title: t("accordion.third"),
            content: <p>{t("accordion.thirdBody")}</p>,
          },
        ]}
      />
      <Accordion
        size="sm"
        type="multiple"
        defaultOpen={["a", "b"]}
        items={[
          { value: "a", title: t("accordion.a"), content: <p>{t("accordion.aBody")}</p> },
          { value: "b", title: t("accordion.b"), content: <p>{t("accordion.bBody")}</p> },
        ]}
      />
    </div>
  );
}
