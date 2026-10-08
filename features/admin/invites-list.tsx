import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { createSearchParamsCache, parseAsStringLiteral, type SearchParams } from "nuqs/server";
import { type Column, DataList } from "@/components/patterns/data-list";
import {
  type ActiveFilter,
  ActiveFilters,
  ListFilter,
  ListNoResults,
  ListPagination,
  ListSearch,
} from "@/components/patterns/list-controls";
import { ListEmpty } from "@/components/patterns/list-states";
import { Stamp } from "@/components/ui/stamp";
import type { AdminViewer } from "@/lib/admin/guard";
import { type InviteRow, inviteStatuses, queryInvites } from "@/lib/admin/invites";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { listParsers } from "@/lib/list-params";
import { inviteTone } from "./presentation";
import { RevokeInvite } from "./revoke-invite";

const searchParamsCache = createSearchParamsCache({
  q: listParsers.q,
  page: listParsers.page,
  status: parseAsStringLiteral(inviteStatuses),
});

export async function InvitesList({
  viewer,
  searchParams,
}: {
  viewer: AdminViewer;
  searchParams: Promise<SearchParams>;
}) {
  const [t, roles] = await Promise.all([
    getTranslations("admin.invites"),
    getTranslations("admin.roles"),
  ]);
  const params = await searchParamsCache.parse(searchParams);
  // The clock decides who is expired, so it is read at request time, never while prerendering.
  await connection();
  const { rows, window } = await queryInvites(db, viewer, params, new Date());

  const columns: Column<InviteRow>[] = [
    { key: "email", header: t("email"), kind: "title", width: "2fr", cell: (row) => row.email },
    { key: "role", header: t("role"), cell: (row) => roles(row.role) },
    {
      key: "status",
      header: t("status"),
      kind: "status",
      cell: (row) => <Stamp tone={inviteTone[row.status]}>{t(`statuses.${row.status}`)}</Stamp>,
    },
    { key: "by", header: t("invitedBy"), width: "2fr", cell: (row) => row.invitedByEmail },
    {
      key: "sent",
      header: t("sent"),
      numeric: true,
      cell: (row) => formatInstantDate(row.createdAt),
    },
    {
      key: "action",
      header: "",
      cell: (row) =>
        row.status === "pending" ? <RevokeInvite id={row.id} email={row.email} /> : null,
    },
  ];

  const filters: ActiveFilter[] =
    params.status === null
      ? []
      : [{ key: "status", name: t("statusFilter"), value: t(`statuses.${params.status}`) }];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
        <ListSearch label={t("searchLabel")} />
        <ListFilter
          param="status"
          label={t("statusFilter")}
          allLabel={t("allStatuses")}
          choices={inviteStatuses.map((value) => ({ value, label: t(`statuses.${value}`) }))}
        />
      </div>
      <ActiveFilters filters={filters} />
      <DataList
        label={t("label")}
        columns={columns}
        rows={rows}
        getKey={(row) => row.id}
        emptyState={
          params.q === "" && filters.length === 0 ? (
            <ListEmpty title={t("emptyTitle")} />
          ) : (
            <ListNoResults term={params.q} filters={filters} />
          )
        }
      />
      <ListPagination window={window} />
    </div>
  );
}
