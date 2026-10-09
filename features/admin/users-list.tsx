import type { Route } from "next";
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
  ListSort,
} from "@/components/patterns/list-controls";
import { ListEmpty } from "@/components/patterns/list-states";
import { Stamp } from "@/components/ui/stamp";
import { isPaidTier, tierNames } from "@/domain/billing/entitlements";
import type { AdminViewer } from "@/lib/admin/guard";
import { queryUsers, type UserRow } from "@/lib/admin/users";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { userRole } from "@/lib/db/schema/users";
import { listParsers } from "@/lib/list-params";

const searchParamsCache = createSearchParamsCache({
  ...listParsers,
  sort: parseAsStringLiteral(["date", "name", "email", "role"] as const).withDefault("date"),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
  role: parseAsStringLiteral(userRole.enumValues),
  plan: parseAsStringLiteral(tierNames),
});

const sortChoices = [
  ["date", "desc", "sortDateDesc"],
  ["date", "asc", "sortDateAsc"],
  ["name", "asc", "sortName"],
  ["email", "asc", "sortEmail"],
  ["role", "asc", "sortRole"],
] as const;

export async function UsersList({
  viewer,
  searchParams,
}: {
  viewer: AdminViewer;
  searchParams: Promise<SearchParams>;
}) {
  const [t, roles, plans] = await Promise.all([
    getTranslations("admin.users"),
    getTranslations("admin.roles"),
    getTranslations("admin.plans"),
  ]);
  const params = await searchParamsCache.parse(searchParams);
  const { rows, window } = await queryUsers(db, viewer, params);

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: t("name"),
      kind: "title",
      width: "2fr",
      cell: (row) => row.name.trim() || row.email,
    },
    { key: "email", header: t("email"), width: "2fr", cell: (row) => row.email },
    { key: "role", header: t("role"), cell: (row) => roles(row.role) },
    {
      key: "plan",
      header: t("plan"),
      kind: "status",
      cell: (row) => (
        <Stamp tone={isPaidTier(row.tier) ? "done" : "neutral"}>
          {row.courtesy ? plans("courtesy") : plans(row.tier)}
        </Stamp>
      ),
    },
    {
      key: "created",
      header: t("created"),
      numeric: true,
      cell: (row) => formatInstantDate(row.createdAt),
    },
  ];

  const filters: ActiveFilter[] = [
    ...(params.role === null
      ? []
      : [{ key: "role", name: t("roleFilter"), value: roles(params.role) }]),
    ...(params.plan === null
      ? []
      : [{ key: "plan", name: t("planFilter"), value: plans(params.plan) }]),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
        <ListSearch label={t("searchLabel")} />
        <ListFilter
          param="role"
          label={t("roleFilter")}
          allLabel={t("allRoles")}
          choices={userRole.enumValues.map((value) => ({ value, label: roles(value) }))}
        />
        <ListFilter
          param="plan"
          label={t("planFilter")}
          allLabel={t("allPlans")}
          choices={tierNames.map((value) => ({ value, label: plans(value) }))}
        />
        <ListSort
          label={t("sortBy")}
          fallback="date:desc"
          choices={sortChoices.map(([column, direction, key]) => ({
            value: `${column}:${direction}`,
            label: t(key),
          }))}
        />
      </div>
      <ActiveFilters filters={filters} />
      <DataList
        label={t("label")}
        columns={columns}
        rows={rows}
        getKey={(row) => row.id}
        rowHref={(row): Route => `/admin/users/${row.id}` as Route}
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
