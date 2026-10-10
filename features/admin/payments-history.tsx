import { getTranslations } from "next-intl/server";
import { Stamp, type StampTone } from "@/components/ui/stamp";
import { isWithinWithdrawal, withdrawalEndsAt } from "@/domain/billing/withdrawal";
import type { Payment } from "@/lib/billing/payments";
import { formatInstantDate } from "@/lib/date";
import { formatMoney, toCents } from "@/lib/money";

const statusTone: Record<Payment["status"], StampTone> = {
  paid: "success",
  partially_refunded: "warning",
  refunded: "neutral",
  disputed: "danger",
};

const knownMethods = ["card", "pix", "boleto"] as const;
const methodKey = (method: string | null) =>
  knownMethods.find((known) => known === method) ?? "other";

/**
 * A person's payments, newest first, read from the local record. When the newest one is still in
 * the withdrawal period, the date it ends is said once, above the list.
 */
export async function PaymentsHistory({ payments, now }: { payments: Payment[]; now: Date }) {
  const t = await getTranslations("admin.user.payments");
  const [latest] = payments;
  const withdrawal =
    latest !== undefined && latest.status === "paid" && isWithinWithdrawal(latest.paidAt, now)
      ? withdrawalEndsAt(latest.paidAt)
      : null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-block-title text-ink">{t("title")}</h2>
      {withdrawal === null ? null : (
        <p className="max-w-[60ch] text-body-small text-warning-ink">
          {t("withdrawal", { date: formatInstantDate(withdrawal) })}
        </p>
      )}
      {payments.length === 0 ? (
        <p className="text-body text-ink-muted">{t("empty")}</p>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-line border-b text-label text-ink-muted">
              <th className="py-2 pe-4 font-medium">{t("date")}</th>
              <th className="py-2 pe-4 text-right font-medium">{t("amount")}</th>
              <th className="py-2 pe-4 font-medium">{t("method")}</th>
              <th className="py-2 font-medium">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="h-row border-line border-b">
                <td className="pe-4 font-mono text-data tabular-nums">
                  {formatInstantDate(payment.paidAt)}
                </td>
                <td className="pe-4 text-right font-mono text-data tabular-nums">
                  {formatMoney(toCents(payment.amountCents), payment.currency)}
                </td>
                <td className="pe-4 text-body">{t(`methods.${methodKey(payment.method)}`)}</td>
                <td>
                  <Stamp tone={statusTone[payment.status]}>{t(`statuses.${payment.status}`)}</Stamp>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
