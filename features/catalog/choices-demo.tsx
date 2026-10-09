"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup } from "@/components/ui/radio-group";

const topics = ["billing", "product", "security"] as const;

/** Checkboxes with a parent that goes partial, a danger one, and a radio group in both sizes. */
export function ChoicesDemo() {
  const t = useTranslations("catalog.choices");
  const [chosen, setChosen] = useState<readonly string[]>(["billing"]);
  const [sure, setSure] = useState(false);
  const [plan, setPlan] = useState("monthly");
  const [small, setSmall] = useState("a");
  const all = chosen.length === topics.length;
  const none = chosen.length === 0;
  let parentState: boolean | "indeterminate" = "indeterminate";
  if (all || none) {
    parentState = all;
  }
  const toggle = (topic: string, on: boolean) =>
    setChosen((current) => (on ? [...current, topic] : current.filter((entry) => entry !== topic)));
  return (
    <div className="grid max-w-3xl gap-10 md:grid-cols-2">
      <div className="flex flex-col">
        <Checkbox
          label={t("all")}
          checked={parentState}
          onCheckedChange={(on) => setChosen(on ? topics : [])}
        />
        <div className="ms-8 flex flex-col border-s-2 border-line ps-4">
          {topics.map((topic) => (
            <Checkbox
              key={topic}
              size="sm"
              label={t(`topics.${topic}`)}
              checked={chosen.includes(topic)}
              onCheckedChange={(on) => toggle(topic, on)}
            />
          ))}
        </div>
        <Checkbox
          tone="danger"
          label={t("sure")}
          description={t("sureHelp")}
          checked={sure}
          onCheckedChange={setSure}
        />
      </div>
      <div className="flex flex-col gap-6">
        <RadioGroup
          legend={t("plan.legend")}
          value={plan}
          onValueChange={setPlan}
          options={[
            { value: "monthly", label: t("plan.monthly"), description: t("plan.monthlyHelp") },
            { value: "yearly", label: t("plan.yearly") },
            { value: "lifetime", label: t("plan.lifetime"), disabled: true },
          ]}
        />
        <RadioGroup
          legend={t("compact.legend")}
          size="sm"
          tone="danger"
          value={small}
          onValueChange={setSmall}
          options={[
            { value: "a", label: t("compact.a") },
            { value: "b", label: t("compact.b") },
          ]}
        />
      </div>
    </div>
  );
}
