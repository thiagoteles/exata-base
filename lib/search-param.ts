/** A query parameter can arrive as a list; the first value is the one that counts. */
export function firstParam(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}
