"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormTextField } from "@/components/patterns/form-text-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/use-toast";
import { type ApiScope, apiScopes } from "@/domain/api/tokens";
import { useErrorText } from "@/lib/use-error-text";
import { createToken, revokeToken } from "./actions";
import { createTokenSchema } from "./schema";

type TokenRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
};

type Values = { name: string; scopes: ApiScope[]; expiresInDays: 30 | 90 | 365 | null };

const LIFETIMES = ["30", "90", "365", "never"] as const;
const COPIED_FOR_MS = 2500;

/*
 * The person's API tokens: a list with when each was last used and a revoke button, and a form that
 * makes a new one. A new token is shown once, in full, above the list, with a button that copies it;
 * after the person leaves the page nothing can show it again.
 */
export function ApiTokens({ rows }: { rows: TokenRow[] }) {
  const t = useTranslations("account.apiTokens");
  const format = useFormatter();
  const describe = useErrorText();
  const notify = useToast();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lifetime, setLifetime] = useState<(typeof LIFETIMES)[number]>("90");
  const form = useForm<Values>({
    resolver: zodResolver(createTokenSchema),
    defaultValues: { name: "", scopes: [...apiScopes], expiresInDays: 90 },
  });
  const scopes = form.watch("scopes");

  const make = form.handleSubmit(async (values) => {
    setPending("create");
    const result = await createToken({
      ...values,
      expiresInDays: lifetime === "never" ? null : (Number(lifetime) as 30 | 90 | 365),
    });
    setPending(null);
    if (result?.data === undefined) {
      notify({ title: t("failed"), description: describe(result?.serverError), tone: "danger" });
      return;
    }
    setFresh(result.data.token);
    form.reset({ name: "", scopes: [...apiScopes], expiresInDays: 90 });
    router.refresh();
  });

  const revoke = async (id: string) => {
    setPending(id);
    const result = await revokeToken({ id });
    setPending(null);
    if (result?.data === undefined) {
      notify({ title: t("failed"), tone: "danger" });
      return;
    }
    router.refresh();
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FOR_MS);
    } catch {
      // The token is on screen and selectable, which is enough when the clipboard is blocked.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {fresh === null ? null : (
        <div className="flex flex-col gap-3 rounded-control border-2 border-brand p-4">
          <p className="text-field-label text-ink">{t("once")}</p>
          <p className="break-all rounded-control border border-line bg-sunken px-3 py-2 font-mono text-data text-ink">
            {fresh}
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => copy(fresh)}>
              {t("copy")}
            </Button>
            <span role="status" className="text-body-small text-ink-muted">
              {copied ? t("copied") : ""}
            </span>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-body-small text-ink-muted">{t("none")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-field-label text-ink">
                  {row.name}
                  <span className="ml-2 font-mono text-data text-ink-muted">{`${row.prefix}…`}</span>
                </p>
                <p className="text-body-small text-ink-muted">
                  {row.scopes.map((scope) => t(`scopes.${scope as ApiScope}`)).join(", ")}
                </p>
                <p className="text-body-small text-ink-muted">
                  {row.lastUsedAt === null
                    ? t("neverUsed")
                    : t("lastUsed", {
                        date: format.dateTime(new Date(row.lastUsedAt), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }),
                      })}
                  {row.expiresAt === null
                    ? null
                    : `  ·  ${t("expires", { date: format.dateTime(new Date(row.expiresAt), { dateStyle: "medium" }) })}`}
                </p>
              </div>
              <Button
                variant="secondary"
                loading={pending === row.id}
                onClick={() => revoke(row.id)}
              >
                {t("revoke")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={make} noValidate className="flex flex-col gap-4">
        <FormTextField form={form} name="name" label={t("name")} autoComplete="off" />
        <fieldset className="flex flex-col">
          <legend className="text-field-label text-ink">{t("scopesLabel")}</legend>
          {apiScopes.map((scope) => (
            <Checkbox
              key={scope}
              label={t(`scopes.${scope}`)}
              checked={scopes.includes(scope)}
              onCheckedChange={(on) =>
                form.setValue(
                  "scopes",
                  on ? [...scopes, scope] : scopes.filter((item) => item !== scope),
                )
              }
            />
          ))}
        </fieldset>
        <div className="flex flex-col gap-2">
          <p className="text-field-label text-ink">{t("lifetimeLabel")}</p>
          <Segmented
            label={t("lifetimeLabel")}
            value={lifetime}
            onValueChange={(next) => setLifetime(next as (typeof LIFETIMES)[number])}
            options={LIFETIMES.map((value) => ({ value, label: t(`lifetime.${value}`) }))}
          />
        </div>
        <div className="self-start">
          <Button type="submit" loading={pending === "create"}>
            {t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
