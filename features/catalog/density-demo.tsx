"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Stamp } from "@/components/ui/stamp";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";

const densities = ["medium", "comfortable", "large"] as const;

/*
 * The same few controls at each density, side by side. Density is a knob of the preset, so the page
 * itself only has one; here each column asks for its own by name, which is how the whole catalog is
 * captured at every density.
 */
function Column({ density }: { density: (typeof densities)[number] }) {
  const t = useTranslations("catalog.density");
  const [mode, setMode] = useState("a");
  const [tab, setTab] = useState("one");
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  return (
    <div
      data-density={density}
      className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-panel-inset"
    >
      <p className="font-mono text-data text-ink-muted">{t(`names.${density}`)}</p>
      <Field label={t("field")}>
        {(control) => <Input {...control} defaultValue={t("value")} />}
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button>{t("primary")}</Button>
        <Button variant="secondary">{t("secondary")}</Button>
      </div>
      <Segmented
        label={t("mode")}
        value={mode}
        onValueChange={setMode}
        options={[
          { value: "a", label: t("first") },
          { value: "b", label: t("second") },
        ]}
      />
      <Tabs
        label={t("tabs")}
        value={tab}
        onValueChange={setTab}
        tabs={[
          {
            value: "one",
            label: t("first"),
            content: <p className="text-body-small text-ink-muted">{t("body")}</p>,
          },
          { value: "two", label: t("second"), content: null },
        ]}
      />
      <Switch label={t("switch")} checked={on} onCheckedChange={setOn} />
      <Checkbox label={t("checkbox")} checked={checked} onCheckedChange={setChecked} />
      <Stamp tone="success">{t("stamp")}</Stamp>
    </div>
  );
}

export function DensityDemo() {
  const t = useTranslations("catalog.density");
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[52ch] text-body-small text-ink-muted">{t("help")}</p>
      <div className="grid gap-6 lg:grid-cols-3">
        {densities.map((density) => (
          <Column key={density} density={density} />
        ))}
      </div>
    </div>
  );
}
