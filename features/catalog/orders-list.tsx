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
import { Stamp, type StampTone } from "@/components/ui/stamp";
import { formatDate } from "@/lib/date";
import { listParsers } from "@/lib/list-params";
import { formatBRL } from "@/lib/money";
import { type Order, type OrderStatus, orderStatuses, queryOrders } from "./sample-orders";

const searchParamsCache = createSearchParamsCache({
  ...listParsers,
  sort: parseAsStringLiteral(["customer", "amount", "date"] as const).withDefault("date"),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
  status: parseAsStringLiteral(orderStatuses),
});

const sortChoices = [
  ["date", "desc", "sortDateDesc"],
  ["date", "asc", "sortDateAsc"],
  ["customer", "asc", "sortCustomer"],
  ["amount", "desc", "sortAmountDesc"],
  ["amount", "asc", "sortAmountAsc"],
] as const;

const tones: Record<OrderStatus, StampTone> = {
  new: "neutral",
  progress: "progress",
  paid: "done",
  refused: "refused",
};

/** Reads the list's state from the address, on the server, and renders exactly that page. */
export async function OrdersList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const t = await getTranslations("catalog");
  const params = await searchParamsCache.parse(searchParams);
  const { rows, window } = queryOrders(params);

  const columns: Column<Order>[] = [
    {
      key: "customer",
      header: t("list.customer"),
      kind: "title",
      width: "2fr",
      cell: (order) => order.customer,
    },
    {
      key: "status",
      header: t("list.status"),
      kind: "status",
      cell: (order) => <Stamp tone={tones[order.status]}>{t(`statuses.${order.status}`)}</Stamp>,
    },
    {
      key: "amount",
      header: t("list.amount"),
      numeric: true,
      cell: (order) => formatBRL(order.amount),
    },
    { key: "date", header: t("list.date"), numeric: true, cell: (order) => formatDate(order.date) },
  ];

  const filters: ActiveFilter[] =
    params.status === null
      ? []
      : [{ key: "status", name: t("list.status"), value: t(`statuses.${params.status}`) }];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end">
        <ListSearch label={t("list.searchLabel")} />
        <ListFilter
          param="status"
          label={t("list.statusFilter")}
          allLabel={t("list.allStatuses")}
          choices={orderStatuses.map((value) => ({ value, label: t(`statuses.${value}`) }))}
        />
        <ListSort
          label={t("list.sortBy")}
          fallback="date:desc"
          choices={sortChoices.map(([column, direction, key]) => ({
            value: `${column}:${direction}`,
            label: t(`list.${key}`),
          }))}
        />
      </div>
      <ActiveFilters filters={filters} />
      <DataList
        label={t("list.label")}
        columns={columns}
        rows={rows}
        getKey={(order) => order.id}
        emptyState={
          params.q === "" && filters.length === 0 ? (
            <ListEmpty title={t("list.emptyTitle")} />
          ) : (
            <ListNoResults term={params.q} filters={filters} />
          )
        }
      />
      <ListPagination window={window} />
    </div>
  );
}
