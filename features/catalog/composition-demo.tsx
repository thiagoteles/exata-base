"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Stepper } from "@/components/ui/stepper";

const initialTags = ["billing", "product", "security"] as const;
type Tag = (typeof initialTags)[number];

/** A sequence in both sizes, tags that can be taken back, and a date typed or picked. */
export function CompositionDemo({ today }: { today: string }) {
  const t = useTranslations("catalog.composition");
  const [tags, setTags] = useState<readonly Tag[]>(initialTags);
  const [due, setDue] = useState("");
  const [window, setWindow] = useState("");
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Stepper
          label={t("stepsLabel")}
          steps={[t("steps.data"), t("steps.address"), t("steps.review")]}
          current={1}
        />
        <Stepper
          size="sm"
          label={t("stepsCompact")}
          steps={[t("steps.data"), t("steps.address"), t("steps.review")]}
          current={2}
        />
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-field-label text-ink">{t("tags")}</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={t(`tagNames.${tag}`)}
              removeLabel={t("remove", { name: t(`tagNames.${tag}`) })}
              onRemove={() => setTags((current) => current.filter((entry) => entry !== tag))}
              tone={tag === "security" ? "danger" : "neutral"}
            />
          ))}
          {tags.length === 0 ? (
            <p className="text-body-small text-ink-muted">{t("noTags")}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label={t("due")} help={t("dueHelp")}>
          {(control) => (
            <DatePicker {...control} value={due} onValueChange={setDue} today={today} />
          )}
        </Field>
        <Field label={t("window")} help={t("windowHelp")}>
          {(control) => (
            <DatePicker
              {...control}
              size="sm"
              weekStart={1}
              value={window}
              onValueChange={setWindow}
              today={today}
              min={today}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
