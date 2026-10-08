"use client";

import { useTranslations } from "next-intl";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { formatDate, type IsoDate } from "@/lib/date";
import { maskCep, maskCpf } from "@/lib/masks";
import { formatBRL, toCents } from "@/lib/money";
import { useWizard } from "./use-wizard";
import { stepNames, type WizardOutput } from "./wizard-schema";
import { AddressStep, DataStep, ValueStep } from "./wizard-steps";

function Steps({ index }: { index: number }) {
  const t = useTranslations("catalog.wizard");
  return (
    <div>
      <p className="font-mono text-data text-ink-muted">
        {t("step", { current: index + 1, total: stepNames.length })}
      </p>
      <ol className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {stepNames.map((name, position) => (
          <li
            key={name}
            aria-current={position === index ? "step" : undefined}
            className={
              position === index ? "text-block-title text-ink" : "text-body text-ink-muted"
            }
          >
            {t(`steps.${name}`)}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Review({ output }: { output: WizardOutput }) {
  const t = useTranslations("catalog.wizard");
  return (
    <div className="flex flex-col gap-4">
      <Stamp tone="done" className="animate-stamp self-start">
        {t("checked")}
      </Stamp>
      <RecordGrid>
        <RecordCell label={t("reviewName")}>{output.name}</RecordCell>
        <RecordCell label={t("cpf")}>
          <span className="font-mono text-data tabular-nums">{maskCpf(output.cpf)}</span>
        </RecordCell>
        <RecordCell label={t("birth")}>
          <span className="font-mono text-data tabular-nums">
            {formatDate(output.birth as IsoDate)}
          </span>
        </RecordCell>
        <RecordCell label={t("reviewAddress")} wide>
          {`${output.street}, ${output.number}, ${output.district}, ${output.city}/${output.state} `}
          <span className="font-mono text-data tabular-nums">{maskCep(output.cep)}</span>
        </RecordCell>
        <RecordCell label={t("reviewAmount")}>
          <span className="font-mono text-data tabular-nums">
            {formatBRL(toCents(output.amount))}
          </span>
        </RecordCell>
      </RecordGrid>
    </div>
  );
}

export function Wizard() {
  const t = useTranslations("catalog.wizard");
  const wizard = useWizard();
  const { form, step } = wizard;
  return (
    <Panel className="flex max-w-3xl flex-col gap-6">
      <Steps index={wizard.index} />
      {step === "data" ? <DataStep control={form.control} /> : null}
      {step === "address" ? (
        <AddressStep
          control={form.control}
          cepHelp={wizard.cepHelp}
          onSearchCep={wizard.searchCep}
          searching={wizard.busy}
          searchLabel={t("searchCep")}
        />
      ) : null}
      {step === "value" ? <ValueStep control={form.control} /> : null}
      {wizard.review === null ? null : <Review output={wizard.review} />}
      {wizard.notice === undefined ? null : (
        <p className="text-body text-danger-ink">{wizard.notice}</p>
      )}
      <div className="flex gap-3 max-sm:flex-col-reverse">
        {wizard.index > 0 ? (
          <Button variant="secondary" onClick={wizard.back} disabled={wizard.busy}>
            {t("back")}
          </Button>
        ) : null}
        <Button onClick={step === "value" ? wizard.confirm : wizard.next} loading={wizard.busy}>
          {step === "value" ? t("confirm") : t("next")}
        </Button>
      </div>
    </Panel>
  );
}
