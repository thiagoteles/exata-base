import { getTranslations } from "next-intl/server";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { isPaidTier } from "@/domain/billing/entitlements";
import type { UserRecord as Record } from "@/lib/admin/users";
import { isCourtesy } from "@/lib/billing/service";
import { formatInstantDate } from "@/lib/date";
import { paymentGateway } from "@/lib/ports/payment";
import { GrantCourtesy, RevokeCourtesy } from "./courtesy-controls";
import { DeleteUser, RefundPayment } from "./danger-controls";
import { PaymentsHistory } from "./payments-history";
import { RoleControl } from "./role-control";

/** One user as a filled-in document, with the actions an admin has over them. */
export async function UserRecord({
  record,
  viewerId,
  now,
}: {
  record: Record;
  viewerId: string;
  now: Date;
}) {
  const [t, roles, plans] = await Promise.all([
    getTranslations("admin.user"),
    getTranslations("admin.roles"),
    getTranslations("admin.plans"),
  ]);
  const { user, plan } = record;
  const paid = isPaidTier(plan.tier);
  const courtesy = isCourtesy(plan);
  const canRefund =
    paid && !courtesy && plan.providerCustomerId !== null && (await paymentGateway()) !== null;
  return (
    <div className="flex flex-col gap-8">
      <RecordGrid>
        <RecordCell
          label={t("plan")}
          stamp={
            <Stamp tone={paid ? "success" : "neutral"}>
              {courtesy ? plans("courtesy") : plans(plan.tier)}
            </Stamp>
          }
        >
          {roles(user.role)}
        </RecordCell>
        <RecordCell label={t("created")}>
          <span className="font-mono text-data tabular-nums">
            {formatInstantDate(user.createdAt)}
          </span>
        </RecordCell>
        <RecordCell label={t("verified")}>{user.emailVerified ? t("yes") : t("no")}</RecordCell>
        {courtesy ? (
          <RecordCell label={t("courtesyFrom")}>{plan.courtesyGrantedByEmail}</RecordCell>
        ) : null}
        {plan.courtesyReason === null ? null : (
          <RecordCell label={t("courtesyReason")} wide>
            {plan.courtesyReason}
          </RecordCell>
        )}
      </RecordGrid>

      <PaymentsHistory payments={record.payments} now={now} />

      <Panel className="flex flex-col gap-6">
        <h2 className="text-block-title text-ink">{t("actions")}</h2>
        <RoleControl id={user.id} role={user.role} />
        {paid ? null : <GrantCourtesy id={user.id} />}
        <div className="flex flex-wrap gap-3">
          {courtesy ? <RevokeCourtesy id={user.id} /> : null}
          {canRefund ? <RefundPayment id={user.id} /> : null}
          {user.id === viewerId ? null : <DeleteUser id={user.id} />}
        </div>
      </Panel>
    </div>
  );
}
