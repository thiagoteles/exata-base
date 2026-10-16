import type { Route } from "next";
import Link from "next/link";
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
import { buttonClasses } from "@/components/ui/styles";
import type { Scope, Viewer } from "@/lib/access/rules";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { listParsers } from "@/lib/list-params";
import { samplePartStatuses } from "@/lib/sample-parts/options";
import { querySampleParts, type SamplePartView } from "@/lib/sample-parts/records";
import { samplePartHref, samplePartStatusTone, showDate } from "./presentation";

const searchParamsCache = createSearchParamsCache({
  ...listParsers,
  sort: parseAsStringLiteral(["name", "date"] as const).withDefault("name"),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
  status: parseAsStringLiteral(samplePartStatuses),
});

const sortChoices = [
  ["name", "asc", "sortName"],
  ["name", "desc", "sortNameDesc"],
  ["date", "desc", "sortDateDesc"],
] as const;

type SamplePartsListProps = {
  viewer: Viewer;
  scope: Scope;
  timeZone: string;
  locale: string;
  searchParams: Promise<SearchParams>;
};

/** The sample parts on file, searched, filtered and paged from the address. */
export async function SamplePartsList({
  viewer,
  scope,
  timeZone,
  locale,
  searchParams,
}: SamplePartsListProps) {
  const t = await getTranslations("sampleParts");
  const params = await searchParamsCache.parse(searchParams);
  const { rows, window } = await querySampleParts(db, viewer, scope, params);

  const columns: Column<SamplePartView>[] = [
    { key: "name", header: t("name"), kind: "title", width: "2fr", cell: (row) => row.name },
    { key: "parent", header: t("parent"), width: "1.5fr", cell: (row) => row.parentName },
    { key: "code", header: t("code"), numeric: true, cell: (row) => row.code ?? "" },
    {
      key: "status",
      header: t("status"),
      kind: "status",
      cell: (row) => (
        <Stamp tone={samplePartStatusTone[row.status]}>{t(`statuses.${row.status}`)}</Stamp>
      ),
    },
    {
      key: "due",
      header: t("dueDate"),
      numeric: true,
      cell: (row) => showDate(row.dueDate, locale) ?? "",
    },
    {
      key: "date",
      header: t("createdAt"),
      numeric: true,
      cell: (row) => formatInstantDate(row.createdAt, timeZone, locale),
    },
  ];

  const filters: ActiveFilter[] =
    params.status === null
      ? []
      : [{ key: "status", name: t("statusFilter"), value: t(`statuses.${params.status}`) }];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <ListSearch label={t("searchLabel")} />
        <ListFilter
          param="status"
          label={t("statusFilter")}
          allLabel={t("allStatuses")}
          choices={samplePartStatuses.map((value) => ({ value, label: t(`statuses.${value}`) }))}
        />
        <ListSort
          label={t("sortBy")}
          fallback="name:asc"
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
        rowHref={(row): Route => samplePartHref(row.id)}
        emptyState={
          params.q === "" && filters.length === 0 ? (
            <ListEmpty
              title={t("emptyTitle")}
              action={
                <Link href={"/sample-parts/new" as Route} className={buttonClasses("primary")}>
                  {t("new")}
                </Link>
              }
            />
          ) : (
            <ListNoResults term={params.q} filters={filters} />
          )
        }
      />
      <ListPagination window={window} />
    </div>
  );
}
