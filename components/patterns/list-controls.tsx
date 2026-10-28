"use client";

import { IconChevronLeft, IconChevronRight, IconSearch, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { debounce, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { PageWindow } from "@/lib/list-params";
// Imported under a capitalized name: the React Compiler folds a local alias back into the JSX tag,
// and a lowercase tag renders as an unknown HTML element instead of the component.
import { productNoResults as ProductNoResults } from "./states.product";

/* The controls write to the address; the server page reads it back. `shallow: false` re-renders it. */
const options = { shallow: false } as const;
const SEARCH_DELAY_MS = 300;

const searchParsers = { q: parseAsString.withDefault(""), page: parseAsInteger.withDefault(1) };

export function ListSearch({ label }: { label: string }) {
  const t = useTranslations("patterns.list");
  const [{ q }, setParams] = useQueryStates(searchParsers, options);
  const [text, setText] = useState(q);
  return (
    <div className="relative max-w-sm min-w-64 flex-1">
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
            className="inline-flex h-chip items-center gap-2 rounded-full border border-line-strong bg-surface px-3 text-label text-ink hover:border-ink"
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

/** What a product's no-results state draws: the sentence, the hint, and the button that clears. */
export type NoResultsViewProps = {
  title: string;
  hint: string;
  clearLabel: string;
  onClear: () => void;
};

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
  const [hint, clear] = noResultsWords(term !== "", filters.length > 0);
  const onClear = () =>
    setParams(Object.fromEntries(Object.keys(parsers).map((key) => [key, null])));
  if (ProductNoResults !== null) {
    return <ProductNoResults title={text} hint={t(hint)} clearLabel={t(clear)} onClear={onClear} />;
  }
  return (
    <div className="flex max-w-[60ch] flex-col items-start gap-3 py-4">
      <p className="text-block-title text-ink">{text}</p>
      <p className="text-body text-ink-muted">{t(hint)}</p>
      <Button variant="secondary" className="mt-2" onClick={onClear}>
        {t(clear)}
      </Button>
    </div>
  );
}

/** What to try and what the button undoes, by what narrowed the list: words, filters or both. */
function noResultsWords(searched: boolean, filtered: boolean) {
  if (searched && filtered) {
    return ["noResultsHintBoth", "clearBoth"] as const;
  }
  return searched
    ? (["noResultsHint", "clear"] as const)
    : (["noResultsHintFilters", "clearFilters"] as const);
}

export function ListPagination({ window }: { window: PageWindow }) {
  const t = useTranslations("patterns.list");
  const [, setParams] = useQueryStates({ page: parseAsInteger }, options);
  // An empty list already says so in its own row; a count of nothing would only repeat it.
  if (window.total === 0) {
    return null;
  }
  const position = t("position", { from: window.from, to: window.to, total: window.total });
  // A list that fits on one page has nowhere to go, so two dead buttons would only be noise.
  if (window.pages <= 1) {
    return <p className="mt-4 font-mono text-data tabular-nums text-ink-muted">{position}</p>;
  }
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
      <p className="font-mono text-data tabular-nums text-ink-muted">{position}</p>
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
    <Field label={label} className="w-full md:w-52">
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
    <Field label={label} className="w-full md:w-52">
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
