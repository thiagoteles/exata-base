import { getTranslations } from "next-intl/server";
import { PageSection } from "@/components/patterns/page-section";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
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
/** Whether a refund can be asked for: a paid plan that was bought, with a payment provider on. */
async function refundable(plan: Record["plan"]) {
  return (
    isPaidTier(plan.tier) &&
    !isCourtesy(plan) &&
    plan.providerCustomerId !== null &&
    (await paymentGateway()) !== null
  );
}

/** What is done to the account as a whole, for the page's header: the danger first. */
export async function UserActions({ record, viewerId }: { record: Record; viewerId: string }) {
  const { user, plan } = record;
  return (
    <>
      {user.id === viewerId ? null : <DeleteUser id={user.id} />}
      {(await refundable(plan)) ? <RefundPayment id={user.id} /> : null}
      {isCourtesy(plan) ? <RevokeCourtesy id={user.id} /> : null}
    </>
  );
}

export async function UserRecord({ record, now }: { record: Record; now: Date }) {
  const [t, roles, plans] = await Promise.all([
    getTranslations("admin.user"),
    getTranslations("admin.roles"),
    getTranslations("admin.plans"),
  ]);
  const { user, plan } = record;
  const paid = isPaidTier(plan.tier);
  const courtesy = isCourtesy(plan);
  // Four cells fill a row of four; a courtesy adds two, and six fill two rows of three.
  const columns = courtesy ? "md:grid-cols-3 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4";
  return (
    <div className="flex flex-col gap-10">
      <RecordGrid className={columns}>
        <RecordCell label={t("plan")}>{courtesy ? plans("courtesy") : plans(plan.tier)}</RecordCell>
        <RecordCell label={t("role.label")}>{roles(user.role)}</RecordCell>
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
          <RecordCell label={t("courtesyReason")}>{plan.courtesyReason}</RecordCell>
        )}
      </RecordGrid>

      <PaymentsHistory payments={record.payments} now={now} />

      <PageSection title={t("actions")}>
        <div className="flex flex-col gap-6">
          <RoleControl id={user.id} role={user.role} />
          {paid ? null : <GrantCourtesy id={user.id} />}
        </div>
      </PageSection>
    </div>
  );
}
