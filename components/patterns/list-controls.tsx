"use client";

import { IconChevronLeft, IconChevronRight, IconSearch, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { debounce, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { PageWindow } from "@/lib/list-params";

/* The controls write to the address; the server page reads it back. `shallow: false` re-renders it. */
const options = { shallow: false } as const;
const SEARCH_DELAY_MS = 300;

const searchParsers = { q: parseAsString.withDefault(""), page: parseAsInteger.withDefault(1) };

export function ListSearch({ label }: { label: string }) {
  const t = useTranslations("patterns.list");
  const [{ q }, setParams] = useQueryStates(searchParsers, options);
  const [text, setText] = useState(q);
  return (
    <div className="relative max-w-sm flex-1">
      <IconSearch
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={t("searchPlaceholder")}
        className="pl-12"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setParams(
            { q: event.target.value || null, page: null },
            { limitUrlUpdates: debounce(SEARCH_DELAY_MS) },
          );
        }}
      />
    </div>
  );
}

export type ActiveFilter = { key: string; name: string; value: string };

/** One removable chip per active filter, on a `sunken` strip, mirrored in the address. */
export function ActiveFilters({ filters }: { filters: readonly ActiveFilter[] }) {
  const t = useTranslations("patterns.list");
  const parsers = Object.fromEntries([
    ...filters.map(({ key }) => [key, parseAsString]),
    ["page", parseAsInteger],
  ]);
  const [, setParams] = useQueryStates(parsers, options);
  if (filters.length === 0) {
    return null;
  }
  return (
    <ul
      aria-label={t("activeFilters")}
      className="mb-4 flex flex-wrap gap-2 rounded-control bg-sunken p-3"
    >
      {filters.map(({ key, name, value }) => (
        <li key={key}>
          <button
            type="button"
            aria-label={t("removeFilter", { name: `${name}: ${value}` })}
            onClick={() => setParams({ [key]: null, page: null })}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-surface px-3 text-label text-ink hover:border-ink"
          >
            {`${name}: ${value}`}
            <IconX className="size-4" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

type NoResultsProps = { term: string; filters: readonly ActiveFilter[] };

/** The same table with one row that repeats what was searched and offers to clear it. */
export function ListNoResults({ term, filters }: NoResultsProps) {
  const t = useTranslations("patterns.list");
  const parsers = Object.fromEntries([
    ...filters.map(({ key }) => [key, parseAsString]),
    ["q", parseAsString],
    ["page", parseAsInteger],
  ]);
  const [, setParams] = useQueryStates(parsers, options);
  const text =
    term === ""
      ? t("noResultsFilters", { filters: filters.length })
      : t("noResults", { term, filters: filters.length });
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-body text-ink">{text}</p>
      <Button
        variant="secondary"
        onClick={() =>
          setParams(Object.fromEntries(Object.keys(parsers).map((key) => [key, null])))
        }
      >
        {t("clear")}
      </Button>
    </div>
  );
}

export function ListPagination({ window }: { window: PageWindow }) {
  const t = useTranslations("patterns.list");
  const [, setParams] = useQueryStates({ page: parseAsInteger }, options);
  return (
    <nav aria-label={t("pagination")} className="mt-4 flex items-center justify-between gap-4">
      <Button
        variant="secondary"
        icon={<IconChevronLeft className="size-5" aria-hidden="true" />}
        disabled={window.page <= 1}
        onClick={() => setParams({ page: window.page - 1 <= 1 ? null : window.page - 1 })}
      >
        {t("previous")}
      </Button>
      <p className="font-mono text-data tabular-nums text-ink-muted">
        {window.total === 0
          ? t("positionNone")
          : t("position", { from: window.from, to: window.to, total: window.total })}
      </p>
      <Button
        variant="secondary"
        disabled={window.page >= window.pages}
        onClick={() => setParams({ page: window.page + 1 })}
      >
        {t("next")}
        <IconChevronRight className="size-5" aria-hidden="true" />
      </Button>
    </nav>
  );
}

type Choice = { value: string; label: string };

const ALL = "all";

/** A select that writes one filter to the address and goes back to the first page. */
export function ListFilter({
  param,
  label,
  allLabel,
  choices,
}: {
  param: string;
  label: string;
  allLabel: string;
  choices: readonly Choice[];
}) {
  const [values, setParams] = useQueryStates(
    { [param]: parseAsString, page: parseAsInteger },
    options,
  );
  const chosen = values[param];
  const current = typeof chosen === "string" ? chosen : ALL;
  return (
    <Field label={label} className="w-full md:w-56">
      {(control) => (
        <Select
          {...control}
          options={[{ value: ALL, label: allLabel }, ...choices]}
          value={current}
          onValueChange={(value) =>
            setParams({ [param]: value === ALL ? null : value, page: null })
          }
          placeholder={allLabel}
        />
      )}
    </Field>
  );
}

/** Sort and direction together, as one choice such as "date:desc", written to the address. */
export function ListSort({
  label,
  choices,
  fallback,
}: {
  label: string;
  /** Each value is `column:direction`. */
  choices: readonly Choice[];
  fallback: string;
}) {
  const [{ sort, dir }, setParams] = useQueryStates(
    { sort: parseAsString, dir: parseAsString, page: parseAsInteger },
    options,
  );
  const [fallbackSort, fallbackDir] = fallback.split(":");
  return (
    <Field label={label} className="w-full md:w-56">
      {(control) => (
        <Select
          {...control}
          options={choices}
          value={`${sort ?? fallbackSort}:${dir ?? fallbackDir}`}
          onValueChange={(value) => {
            const [column, direction] = value.split(":");
            setParams({ sort: column ?? null, dir: direction ?? null, page: null });
          }}
          placeholder={label}
        />
      )}
    </Field>
  );
}
