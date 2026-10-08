"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import type { Interval } from "@/lib/ports/payment/types";
import { useErrorText } from "@/lib/use-error-text";
import { startCheckout } from "./actions";

type Props = {
  interval: Interval;
  /** The purchase ends a subscription the person already has, so it asks first. */
  replacesSubscription?: boolean;
};

/** Opens the provider's checkout. The browser leaves the site, so success is never shown here. */
export function BuyButton({ interval, replacesSubscription = false }: Props) {
  const t = useTranslations("plans");
  const describe = useErrorText();
  const notify = useToast();
  const [pending, setPending] = useState(false);
  const label = interval === "lifetime" ? t("buyLifetime") : t("buy");

  const buy = async () => {
    setPending(true);
    const result = await startCheckout({ interval });
    if (result?.data !== undefined) {
      globalThis.location.assign(result.data.url);
      return;
    }
    setPending(false);
    notify({ title: t("failed"), description: describe(result?.serverError), tone: "danger" });
  };

  if (replacesSubscription) {
    return (
      <ConfirmDialog
        trigger={<Button>{label}</Button>}
        title={t("replaces.title")}
        consequence={t("replaces.body")}
        confirmLabel={t("replaces.confirm")}
        cancelLabel={t("replaces.cancel")}
        onConfirm={buy}
        destructive={false}
        pending={pending}
      />
    );
  }
  return (
    <Button loading={pending} onClick={buy}>
      {label}
    </Button>
  );
}
