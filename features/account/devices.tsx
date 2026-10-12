"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { endDevice, endOtherDevices } from "./actions";

type DeviceRow = {
  id: string;
  browser: string | null;
  system: string | null;
  ipAddress: string | null;
  createdAt: string;
  current: boolean;
};

/*
 * Every place the account is signed in, set as a ledger: the device in large type, when and from
 * where in small type, and one plain action per row. The device in use has no action; it signs out
 * by the usual button.
 */
export function Devices({ rows }: { rows: DeviceRow[] }) {
  const t = useTranslations("account.devices");
  const format = useFormatter();
  const notify = useToast();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const run = async (key: string, call: () => Promise<{ data?: unknown } | undefined>) => {
    setPending(key);
    const result = await call();
    setPending(null);
    if (result?.data === undefined) {
      notify({ title: t("failed"), tone: "danger" });
      return;
    }
    router.refresh();
  };

  const others = rows.filter((row) => !row.current).length;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-field-label text-ink">
                {row.browser === null && row.system === null
                  ? t("unknown")
                  : [row.browser, row.system].filter(Boolean).join(" · ")}
                {row.current ? (
                  <span className="ml-2 rounded-control border border-brand px-1.5 py-0.5 text-body-small text-brand-ink">
                    {t("thisOne")}
                  </span>
                ) : null}
              </p>
              <p className="text-body-small text-ink-muted">
                {t("since", {
                  date: format.dateTime(new Date(row.createdAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
                {row.ipAddress === null ? null : (
                  <span className="font-mono text-data">{`  ·  ${row.ipAddress}`}</span>
                )}
              </p>
            </div>
            {row.current ? null : (
              <Button
                variant="secondary"
                loading={pending === row.id}
                onClick={() => run(row.id, () => endDevice({ id: row.id }))}
              >
                {t("end")}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {others > 0 ? (
        <div className="self-start">
          <Button
            variant="secondary"
            loading={pending === "others"}
            onClick={() => run("others", () => endOtherDevices())}
          >
            {t("endOthers")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
