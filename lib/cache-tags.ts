/*
 * Every cache tag the app uses, by area. A cached read tags itself with one of these, and the write
 * that changes it expires the same one: `updateTag` inside a server action (the writer sees the
 * change at once), `revalidateTag(tag, "max")` in a route handler such as a webhook. A tag is never
 * a loose string, so a typo cannot leave a page stale forever.
 */
export const cacheTags = {
  /** The prices read from the payment provider. */
  prices: () => "prices",
} as const;
