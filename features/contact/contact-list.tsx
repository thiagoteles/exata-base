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
import { contactStatuses } from "@/lib/contact/options";
import { type ContactRow, type ContactStatus, queryContacts } from "@/lib/contact/service";
import { formatDate, formatInstantDate, type IsoDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { publicHref } from "@/lib/i18n/public-paths";
import { listParsers } from "@/lib/list-params";
import { contactStatusTone, recordHref } from "./presentation";

const searchParamsCache = createSearchParamsCache({
  ...listParsers,
  sort: parseAsStringLiteral(["date", "name", "subject", "status"] as const).withDefault("date"),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
  status: parseAsStringLiteral(contactStatuses),
});

const sortChoices = [
  ["date", "desc", "sortDateDesc"],
  ["date", "asc", "sortDateAsc"],
  ["name", "asc", "sortName"],
  ["status", "asc", "sortStatus"],
] as const;

type ContactListProps = {
  viewer: Viewer;
  /** `all` is the team's inbox; `mine` is the messages the viewer wrote. */
  scope: Scope;
  /** The reader's own, so the dates are the days they lived. */
  timeZone: string;
  searchParams: Promise<SearchParams>;
};

/** The contact list for either audience: the same table, filtered by who is looking. */
export async function ContactList({ viewer, scope, timeZone, searchParams }: ContactListProps) {
  const [t, tContact] = await Promise.all([getTranslations("inbox"), getTranslations("contact")]);
  const params = await searchParamsCache.parse(searchParams);
  const { rows, window } = await queryContacts(db, viewer, scope, params);
  const mine = scope === "mine";

  const columns: Column<ContactRow>[] = [
    {
      key: "main",
      header: mine ? t("subject") : t("sender"),
      kind: "title",
      width: "2fr",
      cell: (row) => (mine ? tContact(`subjects.${row.subject}`) : row.name),
    },
    ...(mine
      ? []
      : [
          {
            key: "subject",
            header: t("subject"),
            cell: (row: ContactRow) => tContact(`subjects.${row.subject}`),
          },
        ]),
    {
      key: "status",
      header: t("status"),
      kind: "status",
      cell: (row) => (
        <Stamp tone={contactStatusTone[row.status]}>{tContact(`statuses.${row.status}`)}</Stamp>
      ),
    },
    {
      key: "date",
      header: t("date"),
      numeric: true,
      cell: (row) => formatInstantDate(row.createdAt, timeZone),
    },
  ];

  const filters: ActiveFilter[] =
    params.status === null
      ? []
      : [
          {
            key: "status",
            name: t("status"),
            value: tContact(`statuses.${params.status as ContactStatus}`),
          },
        ];

  const empty = mine ? <MyMessagesEmpty /> : <ListEmpty title={t("emptyTitle")} />;
  const nothingYet = window.total === 0 && params.q === "" && filters.length === 0;

  return (
    <div>
      {nothingYet ? null : <ContactControls />}
      <ActiveFilters filters={filters} />
      <DataList
        label={t("label")}
        columns={columns}
        rows={rows}
        getKey={(row) => row.id}
        rowHref={(row): Route => recordHref(scope, row.id)}
        emptyState={
          params.q === "" && filters.length === 0 ? (
            empty
          ) : (
            <ListNoResults term={params.q} filters={filters} />
          )
        }
      />
      <ListPagination window={window} />
    </div>
  );
}

/** Search, the status filter and the order, once there is something to search. */
async function ContactControls() {
  const [t, tContact] = await Promise.all([getTranslations("inbox"), getTranslations("contact")]);
  return (
    <div className="mb-4 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
      <ListSearch label={t("searchLabel")} />
      <ListFilter
        param="status"
        label={t("statusFilter")}
        allLabel={t("allStatuses")}
        choices={contactStatuses.map((value) => ({
          value,
          label: tContact(`statuses.${value}`),
        }))}
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
  );
}

/** A person's own messages before the first: where they come from, with made-up ones beside it. */
async function MyMessagesEmpty() {
  const [t, tContact] = await Promise.all([
    getTranslations("myMessages"),
    getTranslations("contact"),
  ]);
  return (
    <ListEmpty
      title={t("emptyTitle")}
      body={t("emptyBody")}
      action={
        <Link href={publicHref("/contact")} className={buttonClasses("primary")}>
          {t("emptyAction")}
        </Link>
      }
      preview={(
        [
          ["support", "2026-10-12", "answered"],
          ["billing", "2026-09-28", "in_progress"],
          ["general", "2026-09-03", "answered"],
        ] as const
      ).map(([subject, day, status]) => ({
        key: subject,
        title: tContact(`subjects.${subject}`),
        details: [formatDate(day as IsoDate)],
        stamp: <Stamp tone={contactStatusTone[status]}>{tContact(`statuses.${status}`)}</Stamp>,
      }))}
    />
  );
}
