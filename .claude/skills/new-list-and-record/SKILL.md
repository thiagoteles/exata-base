---
name: new-list-and-record
description: Add a list page and a record page for a domain table. Use when a screen must show rows with search, filters, sorting and paging in the address, or one row as a filled-in document.
---

# New list and record

The reference is the contact inbox. Read these before writing:

- `lib/contact/service.ts`: the query. `queryContacts` takes the **viewer and a scope**, so a page
  cannot forget to filter by who is looking. A list of a person's data is `mine`; a list of
  everyone's needs the staff role and throws 403 otherwise. `getContact` returns null for a row that
  is not the viewer's, and the page turns that into a 404.
- `features/contact/contact-list.tsx`: a server component. It reads the address with
  `createSearchParamsCache` (`lib/list-params.ts` has the shared parsers; add the page's own filters),
  asks the service for the rows and the page window, and draws `DataList`, `ListSearch`,
  `ListFilter`, `ListSort`, `ActiveFilters`, `ListNoResults` and `ListPagination` from
  `components/patterns`.
- `features/contact/contact-record.tsx`: the record as `RecordGrid` cells, the state as a `Stamp`,
  and a `Panel` for what the team can do.
- `app/(app)/staff/contacts/page.tsx` and `.../[id]/page.tsx`: the pages. Both are thin: guard with
  `requirePageRole`, read, `notFound()` when the service returns null, render.

Steps:

1. Write the query in `lib/<area>/service.ts` with the viewer and scope. Order by a column **and the
   id**, so a page boundary never repeats or skips a row. Search with `ilike`, escaping `%` and `_`.
2. Test it in `tests/integration/`: who sees what, filter, search, sort, page, and the empty page.
3. Write the list in `features/<area>/`, then the two pages in `app/`. The page holds the
   `<Suspense>` and the guard; the list never reads the session itself.
4. Add the destination to `lib/navigation.ts` with its minimum role, and its label to
   `nav.items` in `messages/pt-BR.json`.
5. Public pages go into `lib/public-routes.ts` so they reach the sitemap. Signed-in pages never do.
6. A list needs its three states: loading (`ListSkeleton`), empty (`ListEmpty` with the real action)
   and no results (`ListNoResults`). Add an e2e check for the address keeping search and page.
