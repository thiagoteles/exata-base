/** An attachment with the name encoded for any character, as RFC 6266 describes. */
export function attachmentDisposition(downloadName: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`;
}
