import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";

/*
 * What every list keeps in its address: search, sort, direction, page and filters. A page adds
 * its own filters to `listParsers`; the server reads them with `createSearchParamsCache` and the
 * controls write them back, so a list can always be bookmarked, shared and reloaded.
 */

const PAGE_SIZE = 20;

export const listParsers = {
  q: parseAsString.withDefault(""),
  sort: parseAsString.withDefault(""),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
  page: parseAsInteger.withDefault(1),
};

export type PageWindow = {
  /** The page shown, always inside 1..pages. */
  page: number;
  pages: number;
  /** How many rows to skip, for the query. */
  offset: number;
  /** 1-based position of the first and last row on this page; 0 and 0 when the list is empty. */
  from: number;
  to: number;
  total: number;
};

export function pageWindow(page: number, total: number, pageSize: number = PAGE_SIZE): PageWindow {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.trunc(page)), pages);
  const offset = (current - 1) * pageSize;
  if (total === 0) {
    return { page: current, pages, offset, from: 0, to: 0, total };
  }
  return {
    page: current,
    pages,
    offset,
    from: offset + 1,
    to: Math.min(offset + pageSize, total),
    total,
  };
}
