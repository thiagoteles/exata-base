import { getTranslations } from "next-intl/server";
import { createSearchParamsCache, parseAsString, type SearchParams } from "nuqs/server";
import { type Column, DataList } from "@/components/patterns/data-list";
import {
  type ActiveFilter,
  ActiveFilters,
  ListNoResults,
  ListPagination,
  ListSearch,
} from "@/components/patterns/list-controls";
import { ListEmpty } from "@/components/patterns/list-states";
import { type AuditRow, queryAudit } from "@/lib/admin/audit";
import type { AdminViewer } from "@/lib/admin/guard";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { listParsers } from "@/lib/list-params";
import { DateRange } from "./date-range";

const day = /^\d{4}-\d{2}-\d{2}$/;

const searchParamsCache = createSearchParamsCache({
  q: listParsers.q,
  page: listParsers.page,
  from: parseAsString,
  to: parseAsString,
});

const validDay = (value: string | null) => (value !== null && day.test(value) ? value : null);

export async function AuditList({
  viewer,
  searchParams,
}: {
  viewer: AdminViewer;
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("admin.audit");
  const params = await searchParamsCache.parse(searchParams);
  const from = validDay(params.from);
  const to = validDay(params.to);
  const { rows, window } = await queryAudit(db, viewer, {
    actor: params.q,
    from,
    to,
    page: params.page,
  });

  const columns: Column<AuditRow>[] = [
    {
      key: "when",
      header: t("when"),
      numeric: true,
      cell: (row) => formatInstantDate(row.createdAt),
    },
    { key: "who", header: t("who"), kind: "title", width: "2fr", cell: (row) => row.actorEmail },
    {
      key: "action",
      header: t("action"),
      width: "2fr",
      cell: (row) => {
        // The action is free text in the log; a known one has a sentence, any other shows as written.
        const key = `actions.${row.action.replaceAll(".", "_")}` as never;
        return t.has(key) ? t(key) : row.action;
      },
    },
    { key: "target", header: t("target"), numeric: true, cell: (row) => row.targetId ?? "" },
  ];

  const filters: ActiveFilter[] = [
    ...(from === null ? [] : [{ key: "from", name: t("from"), value: from }]),
    ...(to === null ? [] : [{ key: "to", name: t("to"), value: to }]),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
        <ListSearch label={t("searchLabel")} />
        <DateRange />
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
